// Push notifications in the phone app (Capacitor + Firebase). On the website this does nothing.
// After login the app asks for permission, registers the phone (registrar_dispositivo) and opens the
// screen of a notification when it is tapped. The server side is the `push` edge function.
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { supabase } from './supabase';

// Android uses @capacitor/push-notifications (FCM token directly). iPhone uses the Firebase Messaging plugin,
// which turns the Apple token into an FCM token, so the server sends to both the same way.
// (capacitor.config.ts includes each plugin only on its platform.)
export const noAppNativo = () => Capacitor.isNativePlatform();
const ehIos = () => Capacitor.getPlatform() === 'ios';

async function registrarToken(value: string) {
  ultimoToken = value;
  await supabase.rpc('registrar_dispositivo', { p_token: value, p_plataforma: Capacitor.getPlatform() });
}

let ouvintes = false;
let ultimoToken: string | null = null;

function abrirRota(rota?: string) {
  if (!rota) return;
  if (rota.startsWith('/')) window.location.hash = '#' + rota;
  else if (/^https?:\/\//i.test(rota)) window.open(rota, '_blank'); // link from a team notice (opens outside the app)
}

// Small banner when a notification arrives with the app open (Android does not show it by itself then).
function avisoNaTela(titulo: string, corpo: string, rota?: string) {
  const el = document.createElement('button');
  el.style.cssText = 'position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:99999;'
    + 'background:#fff;border:1px solid #eee;border-radius:16px;padding:12px 14px;box-shadow:0 12px 32px rgba(60,20,120,.18);'
    + 'text-align:left;font-family:inherit;display:block';
  el.innerHTML = `<div style="font-weight:700;font-size:14px;color:#1f1b2d"></div><div style="font-size:13px;color:#6b6480;margin-top:2px"></div>`;
  (el.children[0] as HTMLElement).textContent = titulo;
  (el.children[1] as HTMLElement).textContent = corpo;
  el.onclick = () => { abrirRota(rota); el.remove(); };
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

async function prepararOuvintesIos() {
  await FirebaseMessaging.addListener('tokenReceived', ({ token }) => { registrarToken(token); });
  await FirebaseMessaging.addListener('notificationReceived', ({ notification: n }) =>
    avisoNaTela(n.title || 'Negócios de Limpeza', n.body || '', (n.data as any)?.rota));
  await FirebaseMessaging.addListener('notificationActionPerformed', ({ notification: n }) =>
    abrirRota((n.data as any)?.rota));
}

async function prepararOuvintes() {
  if (ouvintes) return;
  ouvintes = true;
  if (ehIos()) return prepararOuvintesIos();
  await PushNotifications.createChannel({
    id: 'avisos', name: 'Avisos da agenda', description: 'Novos serviços, lembretes e pagamentos',
    importance: 4, visibility: 1, sound: 'default', vibration: true, lightColor: '#A163FF',
  }).catch(() => {});
  await PushNotifications.addListener('registration', ({ value }) => registrarToken(value));
  await PushNotifications.addListener('registrationError', e => console.warn('push: registro falhou', e));
  await PushNotifications.addListener('pushNotificationReceived', n =>
    avisoNaTela(n.title || 'Negócios de Limpeza', n.body || '', (n.data as any)?.rota));
  await PushNotifications.addListener('pushNotificationActionPerformed', a =>
    abrirRota((a.notification.data as any)?.rota));
}

export type EstadoPush = 'indisponivel' | 'ativo' | 'negado' | 'pendente';

export async function estadoPush(): Promise<EstadoPush> {
  if (!noAppNativo()) return 'indisponivel';
  const { receive } = ehIos() ? await FirebaseMessaging.checkPermissions() : await PushNotifications.checkPermissions();
  return receive === 'granted' ? 'ativo' : receive === 'denied' ? 'negado' : 'pendente';
}

// Asks for permission (only the first time Android shows the dialog) and registers this phone.
export async function ativarPush(): Promise<EstadoPush> {
  if (!noAppNativo()) return 'indisponivel';
  const { data } = await supabase.auth.getSession();
  if (!data.session) return 'pendente';
  await prepararOuvintes();
  if (ehIos()) {
    let { receive: r } = await FirebaseMessaging.checkPermissions();
    if (r === 'prompt' || r === 'prompt-with-rationale') r = (await FirebaseMessaging.requestPermissions()).receive;
    if (r !== 'granted') return r === 'denied' ? 'negado' : 'pendente';
    const { token } = await FirebaseMessaging.getToken();
    if (token) await registrarToken(token);
    return 'ativo';
  }
  let { receive } = await PushNotifications.checkPermissions();
  if (receive === 'prompt' || receive === 'prompt-with-rationale') receive = (await PushNotifications.requestPermissions()).receive;
  if (receive !== 'granted') return receive === 'denied' ? 'negado' : 'pendente';
  await PushNotifications.register();
  return 'ativo';
}

// Before logging out, so the next person who uses this phone does not get these notifications.
export async function desligarPush() {
  if (!noAppNativo() || !ultimoToken) return;
  try { await supabase.rpc('remover_dispositivo', { p_token: ultimoToken }); } catch { /* offline: ignore */ }
}

export async function testarPush(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('push', { body: { acao: 'teste' } });
  if (error) return 'Não foi possível enviar o teste agora.';
  return data?.ok ? 'Pronto! A notificação de teste deve chegar em alguns segundos.' : (data?.erro || 'Não foi possível enviar o teste.');
}
