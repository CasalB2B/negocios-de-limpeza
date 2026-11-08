// Push notifications in the phone app (Capacitor + Firebase). On the website this does nothing.
// After login the app asks for permission, registers the phone (registrar_dispositivo) and opens the
// screen of a notification when it is tapped. The server side is the `push` edge function.
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

export const noAppNativo = () => Capacitor.isNativePlatform();

let ouvintes = false;
let ultimoToken: string | null = null;

function abrirRota(rota?: string) {
  if (rota && rota.startsWith('/')) window.location.hash = '#' + rota;
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

async function prepararOuvintes() {
  if (ouvintes) return;
  ouvintes = true;
  await PushNotifications.createChannel({
    id: 'avisos', name: 'Avisos da agenda', description: 'Novos serviços, lembretes e pagamentos',
    importance: 4, visibility: 1, sound: 'default', vibration: true, lightColor: '#A163FF',
  }).catch(() => {});
  await PushNotifications.addListener('registration', async ({ value }) => {
    ultimoToken = value;
    await supabase.rpc('registrar_dispositivo', { p_token: value, p_plataforma: Capacitor.getPlatform() });
  });
  await PushNotifications.addListener('registrationError', e => console.warn('push: registro falhou', e));
  await PushNotifications.addListener('pushNotificationReceived', n =>
    avisoNaTela(n.title || 'Negócios de Limpeza', n.body || '', (n.data as any)?.rota));
  await PushNotifications.addListener('pushNotificationActionPerformed', a =>
    abrirRota((a.notification.data as any)?.rota));
}

export type EstadoPush = 'indisponivel' | 'ativo' | 'negado' | 'pendente';

export async function estadoPush(): Promise<EstadoPush> {
  if (!noAppNativo()) return 'indisponivel';
  const { receive } = await PushNotifications.checkPermissions();
  return receive === 'granted' ? 'ativo' : receive === 'denied' ? 'negado' : 'pendente';
}

// Asks for permission (only the first time Android shows the dialog) and registers this phone.
export async function ativarPush(): Promise<EstadoPush> {
  if (!noAppNativo()) return 'indisponivel';
  const { data } = await supabase.auth.getSession();
  if (!data.session) return 'pendente';
  await prepararOuvintes();
  let { receive } = await PushNotifications.checkPermissions();
  if (receive === 'prompt' || receive === 'prompt-with-rationale') receive = (await PushNotifications.requestPermissions()).receive;
  if (receive !== 'granted') return receive === 'denied' ? 'negado' : 'pendente';
  await PushNotifications.register();
  return 'ativo';
}

// Before logging out, so the next person who uses this phone does not get these notifications.
export async function desligarPush() {
  if (!noAppNativo() || !ultimoToken) return;
  await supabase.rpc('remover_dispositivo', { p_token: ultimoToken }).catch(() => {});
}

export async function testarPush(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('push', { body: { acao: 'teste' } });
  if (error) return 'Não foi possível enviar o teste agora.';
  return data?.ok ? 'Pronto! A notificação de teste deve chegar em alguns segundos.' : (data?.erro || 'Não foi possível enviar o teste.');
}
