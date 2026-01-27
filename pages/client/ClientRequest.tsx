import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Check, ArrowLeft, ChevronRight, CheckCircle, Shirt, HardHat, Sparkles, Send, ChevronLeft as ChevronLeftIcon, User, Facebook, Loader, Plus, MapPin } from 'lucide-react';
import { useData } from '../../components/DataContext'; // Import useData
import { Address } from '../../types';
import { ClientSchema, AddressSchema } from '../../src/validators/schemas';
import { toast } from 'react-toastify';

export const ClientRequest: React.FC = () => {
   const navigate = useNavigate();
   const { addService, services, registerClient, serviceDefinitions, currentUser, addClientAddress } = useData();
   const [step, setStep] = useState(1);
   const [registrationSuccess, setRegistrationSuccess] = useState(false);
   const totalSteps = 6;
   const [isSubmitting, setIsSubmitting] = useState(false);

   // --- STATE ---
   const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

   // Address Detailed State
   const [addrStreet, setAddrStreet] = useState('');
   const [addrNumber, setAddrNumber] = useState('');
   const [addrDistrict, setAddrDistrict] = useState('');
   const [addrCity, setAddrCity] = useState('');
   const [addrState, setAddrState] = useState('');
   const [selectedAddressId, setSelectedAddressId] = useState<number | string | null>(null);
   const [isNewAddress, setIsNewAddress] = useState(false);

   // Dynamic Details States
   const [qtyUnit, setQtyUnit] = useState(1); // Hours, or SQM base
   const [rooms, setRooms] = useState(1);
   const [bathrooms, setBathrooms] = useState(1);

   // Extras
   const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

   // Date State
   const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
   const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

   // Registration State (Step 6)
   const [regData, setRegData] = useState({
      name: '',
      email: '',
      phone: '',
      password: ''
   });

   const [errors, setErrors] = useState<Record<string, string>>({});

   // --- HELPER: GET SELECTED SERVICE DEFINITION ---
   const selectedDef = useMemo(() =>
      serviceDefinitions.find(s => s.id === selectedServiceId),
      [selectedServiceId, serviceDefinitions]);

   // --- HELPER: CALCULATE PRICE ---
   const totalPrice = useMemo(() => {
      if (!selectedDef) return 0;

      let total = selectedDef.basePrice;

      if (selectedDef.pricingModel === 'ROOMS') {
         total += (rooms * selectedDef.pricePerUnit);
         total += (bathrooms * (selectedDef.pricePerBath || 0));
      } else {
         // Hourly or SQM
         total += (qtyUnit * selectedDef.pricePerUnit);
      }

      // Extras
      selectedExtras.forEach(extraId => {
         const extraDef = selectedDef.extras.find(e => e.id === extraId);
         if (extraDef) total += extraDef.price;
      });

      return total;
   }, [selectedDef, rooms, bathrooms, qtyUnit, selectedExtras]);

   const toggleExtra = (id: string) => {
      if (selectedExtras.includes(id)) setSelectedExtras(prev => prev.filter(e => e !== id));
      else setSelectedExtras(prev => [...prev, id]);
   };

   const handleCancel = () => {
      if (currentUser) {
         navigate('/client/dashboard');
      } else {
         navigate('/');
      }
   };

   const handleSocialRegister = async (provider: string) => {
      // Simulação de cadastro via Google/Facebook
      setIsSubmitting(true);
      const newClientId = `user_social_${Date.now()}`;
      const fakeName = provider === 'Google' ? 'Usuário Google' : 'Usuário Facebook';

      const newAddressObj: Address = {
         id: Date.now(),
         alias: 'Endereço do Pedido',
         street: addrStreet,
         number: addrNumber,
         district: addrDistrict,
         city: addrCity || 'Não informada',
         state: addrState || 'UF',
         cep: '',
         type: 'HOUSE',
         isMain: true
      };

      const newClient = {
         id: newClientId,
         name: fakeName,
         email: `${provider.toLowerCase()}@exemplo.com`,
         phone: '',
         address: `${addrStreet}, ${addrNumber} - ${addrDistrict}, ${addrCity} - ${addrState}`,
         addresses: [newAddressObj],
         type: 'AVULSO' as const,
         password: '123456', // Senha padrão para login social
         createdAt: Date.now()
      };

      await registerClient(newClient);

      // Cria o serviço automaticamente
      await createService(newClientId, fakeName);
      setIsSubmitting(false);
   };

   const createService = async (clientId: string, clientName: string) => {
      if (!selectedDef) return;

      let details = "";
      if (selectedDef.pricingModel === 'ROOMS') details = `${rooms} Quartos, ${bathrooms} Banheiros`;
      else if (selectedDef.pricingModel === 'HOURLY') details = `${qtyUnit} Horas`;
      else details = `${qtyUnit} m²`;

      const extraLabels = selectedExtras.map(eid => selectedDef.extras.find(e => e.id === eid)?.label).join(', ');
      const fullAddressString = `${addrStreet}, ${addrNumber} - ${addrDistrict}, ${addrCity} - ${addrState}`;

      const newService = {
         id: `srv_${Date.now()}`, // ID único baseado em timestamp
         clientId: clientId,
         clientName: clientName,
         type: selectedDef.name,
         date: selectedDateStr || '',
         time: '08:00',
         address: fullAddressString,
         status: 'PENDING',
         price: totalPrice,
         duration: '2h', // Valor padrão re-adicionado
         createdAt: Date.now(),
         notes: `Detalhes: ${details}. Extras: ${extraLabels}`
      };

      await addService(newService);
      navigate('/client/dashboard');
   };

   const handleFinalize = async () => {
      if (!selectedDef) return;
      setIsSubmitting(true);

      try {
         let clientId = currentUser?.id;
         let clientName = currentUser?.name;
         const fullAddressString = `${addrStreet}, ${addrNumber} - ${addrDistrict}, ${addrCity} - ${addrState}`;

         if (!currentUser) {
            if (!regData.name || !regData.email || !regData.password) {
               alert("Por favor, preencha todos os dados do cadastro para continuar.");
               setIsSubmitting(false);
               return;
            }

            const newClientId = `user_${Date.now()}`;

            const newAddressObj: Address = {
               id: Date.now(),
               alias: 'Endereço do Pedido',
               street: addrStreet,
               number: addrNumber,
               district: addrDistrict,
               city: addrCity || 'Não informada',
               state: 'UF',
               cep: '',
               type: 'HOUSE',
               isMain: true
            };

            const newClient = {
               id: newClientId,
               name: regData.name,
               email: regData.email,
               phone: regData.phone,
               address: fullAddressString,
               addresses: [newAddressObj],
               type: 'AVULSO' as const,
               password: regData.password || '123456', // Senha do formulário ou padrão
               createdAt: Date.now()
            };

            await registerClient(newClient);
            setRegistrationSuccess(true);
            clientId = newClientId;
            clientName = regData.name;
         }

         await createService(clientId!, clientName!);

         // Salva novo endereço se o usuário estiver logado e escolheu 'Novo Endereço'
         if (currentUser && isNewAddress) {
            const newAddr: Address = {
               id: Date.now(),
               alias: `Endereço ${currentUser.addresses ? currentUser.addresses.length + 1 : 1}`,
               street: addrStreet,
               number: addrNumber,
               district: addrDistrict,
               city: addrCity || 'Não informada',
               state: addrState || 'UF',
               cep: '',
               type: 'HOUSE',
               isMain: false
            };
            await addClientAddress(currentUser.id, newAddr);
         }
      } catch (e) {
         console.error("Erro ao finalizar:", e);
         alert("Ocorreu um erro ao processar seu pedido. Tente novamente.");
      } finally {
         setIsSubmitting(false);
      }
   };

   const nextStep = () => {
      setErrors({});

      if (step === 1) {
         // Validação de Endereço se for novo ou não logado
         if (isNewAddress || !currentUser) {
            const addressToValidate = {
               alias: 'Endereço do Pedido',
               street: addrStreet,
               number: addrNumber,
               district: addrDistrict,
               city: addrCity || 'Não informada',
               state: addrState || 'UF',
               cep: '00000000', // Mock CEP se não houver campo
               type: 'HOUSE'
            };

            const result = AddressSchema.safeParse(addressToValidate);
            if (!result.success) {
               const fieldErrors: any = {};
               result.error.issues.forEach(err => {
                  if (err.path[0]) fieldErrors[err.path[0]] = err.message;
               });
               setErrors(fieldErrors);
               toast.error("Corrija os erros no endereço.");
               return;
            }
         } else if (!selectedAddressId) {
            toast.error("Selecione um endereço.");
            return;
         }

         if (!selectedServiceId) {
            toast.error("Selecione um tipo de serviço.");
            return;
         }
      }

      if (step === 6 && !currentUser) {
         // Validação de Cadastro
         const clientToValidate = {
            ...regData,
            address: `${addrStreet}, ${addrNumber} - ${addrDistrict}`,
            type: 'AVULSO'
         };

         const result = ClientSchema.safeParse(clientToValidate);
         if (!result.success) {
            const fieldErrors: any = {};
            result.error.issues.forEach(err => {
               if (err.path[0]) fieldErrors[err.path[0]] = err.message;
            });
            setErrors(fieldErrors);
            toast.error("Corrija os erros no cadastro.");
            return;
         }
      }

      if (step < totalSteps) setStep(s => s + 1);
      else handleFinalize();
   };

   const prevStep = () => setStep(s => s - 1);

   // --- RENDERERS (Mantidos iguais, omitindo apenas para brevidade se não houve alteração lógica interna) ---
   const getIcon = (iconName: string) => {
      switch (iconName) {
         case 'sparkles': return <Sparkles size={24} />;
         case 'shirt': return <Shirt size={24} />;
         case 'hardhat': return <HardHat size={24} />;
         default: return <Sparkles size={24} />;
      }
   };

   const renderStep1 = () => (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
         <div>
            <label className="block text-lg font-bold text-darkText dark:text-darkTextPrimary mb-4 text-center">Qual tipo de serviço você precisa?</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {serviceDefinitions.filter(s => s.active).map(srv => (
                  <button
                     key={srv.id}
                     onClick={() => setSelectedServiceId(srv.id)}
                     className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${selectedServiceId === srv.id ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface hover:border-primary/50'}`}
                  >
                     <div className={`mb-4 w-12 h-12 rounded-full flex items-center justify-center transition-colors ${selectedServiceId === srv.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-darkBg text-lightText dark:text-darkTextSecondary group-hover:bg-primary/10 group-hover:text-primary'}`}>
                        {getIcon(srv.icon)}
                     </div>
                     <h3 className={`font-bold text-lg mb-1 ${selectedServiceId === srv.id ? 'text-primary' : 'text-darkText dark:text-darkTextPrimary'}`}>{srv.name}</h3>
                     <p className="text-xs text-lightText dark:text-darkTextSecondary">{srv.description}</p>
                  </button>
               ))}
            </div>
         </div>

         <div className="bg-white dark:bg-darkSurface p-6 rounded-2xl border border-gray-100 dark:border-darkBorder">
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-4 text-center md:text-left">Onde será o serviço?</label>

            {currentUser && currentUser.addresses && currentUser.addresses.length > 0 && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {currentUser.addresses.map((addr) => (
                     <button
                        key={addr.id}
                        onClick={() => {
                           setSelectedAddressId(addr.id);
                           setIsNewAddress(false);
                           setAddrStreet(addr.street);
                           setAddrNumber(addr.number);
                           setAddrDistrict(addr.district);
                           setAddrCity(addr.city);
                           setAddrState(addr.state);
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all relative ${selectedAddressId === addr.id && !isNewAddress ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-darkBorder bg-gray-50 dark:bg-darkBg hover:border-primary/30'}`}
                     >
                        <div className="flex items-center gap-3">
                           <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedAddressId === addr.id && !isNewAddress ? 'border-primary' : 'border-gray-300'}`}>
                              {selectedAddressId === addr.id && !isNewAddress && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
                           </div>
                           <div>
                              <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{addr.alias}</p>
                              <p className="text-xs text-lightText dark:text-darkTextSecondary truncate max-w-[150px]">{addr.street}, {addr.number}</p>
                           </div>
                        </div>
                     </button>
                  ))}
                  <button
                     onClick={() => {
                        setIsNewAddress(true);
                        setSelectedAddressId(null);
                        setAddrStreet('');
                        setAddrNumber('');
                        setAddrDistrict('');
                        setAddrCity('');
                        setAddrState('');
                     }}
                     className={`p-4 rounded-xl border-2 border-dashed text-left transition-all ${isNewAddress ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-darkBorder bg-transparent hover:border-primary/50'}`}
                  >
                     <div className="flex items-center gap-3">
                        <Plus size={20} className="text-primary" />
                        <span className="font-bold text-sm text-primary">Novo Endereço</span>
                     </div>
                  </button>
               </div>
            )}

            {(isNewAddress || !currentUser || (currentUser && currentUser.addresses.length === 0)) && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                  <div className="md:col-span-2">
                     <input type="text" placeholder="Rua / Avenida" value={addrStreet} onChange={(e) => setAddrStreet(e.target.value)} className={`w-full p-4 bg-gray-50 dark:bg-darkBg border rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary ${errors.street ? 'border-red-500' : 'border-gray-200 dark:border-darkBorder'}`} />
                     {errors.street && <p className="text-red-500 text-xs mt-1 font-bold">{errors.street}</p>}
                  </div>
                  <div>
                     <input type="text" placeholder="Número" value={addrNumber} onChange={(e) => setAddrNumber(e.target.value)} className={`w-full p-4 bg-gray-50 dark:bg-darkBg border rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary ${errors.number ? 'border-red-500' : 'border-gray-200 dark:border-darkBorder'}`} />
                     {errors.number && <p className="text-red-500 text-xs mt-1 font-bold">{errors.number}</p>}
                  </div>
                  <div>
                     <input type="text" placeholder="Bairro" value={addrDistrict} onChange={(e) => setAddrDistrict(e.target.value)} className={`w-full p-4 bg-gray-50 dark:bg-darkBg border rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary ${errors.district ? 'border-red-500' : 'border-gray-200 dark:border-darkBorder'}`} />
                     {errors.district && <p className="text-red-500 text-xs mt-1 font-bold">{errors.district}</p>}
                  </div>
                  <div className="md:col-span-2">
                     <input type="text" placeholder="Cidade (Opcional)" value={addrCity} onChange={(e) => setAddrCity(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary" />
                  </div>
               </div>
            )}
         </div>
      </div>
   );

   const renderStep2 = () => {
      if (!selectedDef) return null;
      return (
         <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="text-center">
               <h3 className="font-bold text-darkText dark:text-darkTextPrimary text-xl mb-1">Detalhes do Pedido</h3>
               <p className="text-lightText text-sm">Personalize para um orçamento preciso.</p>
            </div>
            {selectedDef.pricingModel === 'ROOMS' && (
               <div className="flex justify-center gap-8">
                  <div className="text-center">
                     <p className="mb-2 font-bold text-darkText dark:text-darkTextPrimary">Quartos</p>
                     <div className="flex items-center gap-4 bg-white dark:bg-darkSurface p-2 rounded-2xl border border-gray-100 dark:border-darkBorder">
                        <button onClick={() => setRooms(Math.max(1, rooms - 1))} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-darkBorder flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700">-</button>
                        <span className="text-2xl font-bold text-darkText dark:text-darkTextPrimary w-8">{rooms}</span>
                        <button onClick={() => setRooms(rooms + 1)} className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primaryHover">+</button>
                     </div>
                  </div>
                  <div className="text-center">
                     <p className="mb-2 font-bold text-darkText dark:text-darkTextPrimary">Banheiros</p>
                     <div className="flex items-center gap-4 bg-white dark:bg-darkSurface p-2 rounded-2xl border border-gray-100 dark:border-darkBorder">
                        <button onClick={() => setBathrooms(Math.max(1, bathrooms - 1))} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-darkBorder flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700">-</button>
                        <span className="text-2xl font-bold text-darkText dark:text-darkTextPrimary w-8">{bathrooms}</span>
                        <button onClick={() => setBathrooms(bathrooms + 1)} className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primaryHover">+</button>
                     </div>
                  </div>
               </div>
            )}
            {selectedDef.pricingModel === 'HOURLY' && (
               <div className="text-center max-w-sm mx-auto">
                  <p className="mb-4 font-bold text-darkText dark:text-darkTextPrimary">Quantas horas?</p>
                  <div className="flex items-center gap-4 bg-white dark:bg-darkSurface p-4 rounded-2xl border border-gray-100 dark:border-darkBorder justify-between">
                     <button onClick={() => setQtyUnit(Math.max(2, qtyUnit - 1))} className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-darkBorder flex items-center justify-center text-xl font-bold">-</button>
                     <div className="text-center">
                        <span className="text-4xl font-bold text-primary">{qtyUnit}h</span>
                        <p className="text-xs text-lightText">Estimado</p>
                     </div>
                     <button onClick={() => setQtyUnit(qtyUnit + 1)} className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center text-xl font-bold">+</button>
                  </div>
               </div>
            )}
            {selectedDef.pricingModel === 'SQM' && (
               <div className="text-center max-w-sm mx-auto">
                  <p className="mb-4 font-bold text-darkText dark:text-darkTextPrimary">Tamanho Aproximado (m²)</p>
                  <input type="number" className="w-full text-center text-4xl font-bold p-4 rounded-2xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface focus:border-primary outline-none text-primary" value={qtyUnit} onChange={(e) => setQtyUnit(Math.max(1, parseInt(e.target.value) || 0))} />
               </div>
            )}
            {selectedDef.extras.length > 0 && (
               <div className="pt-6 border-t border-gray-100 dark:border-darkBorder">
                  <h4 className="text-center font-bold text-darkText dark:text-darkTextPrimary mb-4">Adicionais</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {selectedDef.extras.map(extra => (
                        <div key={extra.id} onClick={() => toggleExtra(extra.id)} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${selectedExtras.includes(extra.id) ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface hover:bg-gray-50'}`}>
                           <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedExtras.includes(extra.id) ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                                 {selectedExtras.includes(extra.id) && <Check size={14} className="text-white" />}
                              </div>
                              <span className="text-sm font-medium text-darkText dark:text-darkTextPrimary">{extra.label}</span>
                           </div>
                           <span className="text-sm font-bold text-primary">+ R$ {extra.price}</span>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>
      );
   };

   const renderStep3 = () => (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
         <h3 className="text-center font-bold text-darkText dark:text-darkTextPrimary">Observações</h3>
         <textarea className="w-full p-4 border border-gray-200 dark:border-darkBorder rounded-xl h-32 text-darkText dark:text-darkTextPrimary bg-white dark:bg-darkSurface" placeholder="Descreva detalhes adicionais..." />
      </div>
   );

   // Calendar Logic & Render Step 4
   const generateCalendarDays = () => {
      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();
      const days = [];
      for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
      for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
      return days;
   };
   const isDateOccupied = (date: Date) => {
      const dateStr = date.toLocaleDateString('pt-BR');
      const servicesOnDay = services.filter(s => s.date === dateStr).length;
      return servicesOnDay >= 3;
   };
   const handleDateSelect = (date: Date) => {
      if (date < new Date(new Date().setHours(0, 0, 0, 0))) return;
      if (isDateOccupied(date)) return;
      setSelectedDateStr(date.toLocaleDateString('pt-BR'));
   };
   const changeMonth = (delta: number) => {
      const newDate = new Date(currentMonthDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setCurrentMonthDate(newDate);
   };

   const renderStep4 = () => {
      const days = generateCalendarDays();
      const monthName = currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return (
         <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="text-center">
               <h3 className="text-xl font-bold text-darkText dark:text-darkTextPrimary mb-2">Disponibilidade Real</h3>
               <p className="text-lightText dark:text-darkTextSecondary">Consulte nossa agenda atualizada.</p>
            </div>
            <div className="bg-white dark:bg-darkSurface rounded-2xl p-6 border border-gray-100 dark:border-darkBorder shadow-sm max-w-md mx-auto">
               <div className="flex justify-between items-center mb-6">
                  <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-darkBg rounded-full"><ChevronLeftIcon size={20} className="text-darkText dark:text-darkTextPrimary" /></button>
                  <span className="font-bold text-lg text-darkText dark:text-darkTextPrimary">{capitalizedMonth}</span>
                  <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-darkBg rounded-full"><ChevronRight size={20} className="text-darkText dark:text-darkTextPrimary" /></button>
               </div>
               <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (<span key={d} className="text-xs font-bold text-lightText dark:text-darkTextSecondary">{d}</span>))}
               </div>
               <div className="grid grid-cols-7 gap-2">
                  {days.map((date, idx) => {
                     if (!date) return <div key={idx}></div>;
                     const dateStr = date.toLocaleDateString('pt-BR');
                     const isSelected = selectedDateStr === dateStr;
                     const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                     const isBusy = isDateOccupied(date);
                     let btnClass = "hover:bg-gray-100 dark:hover:bg-darkBg text-darkText dark:text-darkTextPrimary";
                     if (isSelected) btnClass = "bg-primary text-white shadow-lg scale-105";
                     else if (isPast) btnClass = "text-gray-300 dark:text-gray-600 cursor-not-allowed";
                     else if (isBusy) btnClass = "bg-red-50 text-red-300 cursor-not-allowed decoration-red-500";
                     return (
                        <button key={idx} onClick={() => !isPast && !isBusy && handleDateSelect(date)} disabled={isPast || isBusy} className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all relative ${btnClass}`}>
                           {date.getDate()}
                           {isBusy && !isPast && <div className="absolute bottom-1 w-1 h-1 bg-red-400 rounded-full"></div>}
                        </button>
                     );
                  })}
               </div>
            </div>
         </div>
      );
   };

   const renderStep5 = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
         <div className="bg-white dark:bg-darkSurface p-8 rounded-2xl border border-gray-100 dark:border-darkBorder shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
            <Sparkles size={48} className="text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary mb-2">Revisão do Pedido</h2>

            <div className="text-left bg-gray-50 dark:bg-darkBg p-6 rounded-xl space-y-4 mb-6 mt-6">
               <div className="flex justify-between border-b border-gray-200 dark:border-darkBorder pb-2">
                  <span className="text-lightText">Serviço</span>
                  <span className="font-bold text-darkText dark:text-darkTextPrimary">{selectedDef?.name}</span>
               </div>
               <div className="flex justify-between border-b border-gray-200 dark:border-darkBorder pb-2">
                  <span className="text-lightText">Endereço</span>
                  <span className="font-bold text-darkText dark:text-darkTextPrimary text-right max-w-[200px] truncate">{addrStreet}, {addrNumber}</span>
               </div>

               <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-darkBorder items-center">
                  <span className="text-lg font-bold text-darkText dark:text-darkTextPrimary">Total Estimado</span>
                  <span className="text-3xl font-bold text-primary">R$ {totalPrice.toFixed(2)}</span>
               </div>
            </div>

            <Button onClick={nextStep} fullWidth icon={<CheckCircle size={20} />}>Confirmar e Identificar-se</Button>
         </div>
      </div>
   );

   const renderStep6 = () => (
      <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
         <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary mb-2">
               {currentUser ? 'Confirmação Final' : 'Crie sua conta'}
            </h2>
            <p className="text-lightText dark:text-darkTextSecondary">
               {currentUser ? 'Verifique seus dados para finalizar o pedido.' : 'Para acompanhar o pedido, precisamos do seu cadastro.'}
            </p>
         </div>

         {currentUser ? (
            <div className="space-y-5 bg-white dark:bg-darkSurface p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-darkBorder text-center">
               <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                  <User size={32} className="text-green-600 dark:text-green-400" />
               </div>
               <h3 className="font-bold text-lg text-darkText dark:text-darkTextPrimary">Logado como {currentUser.name}</h3>
               <Button onClick={nextStep} disabled={isSubmitting} fullWidth className="mt-2 h-12" icon={isSubmitting ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}>
                  {isSubmitting ? 'Enviando...' : 'Finalizar Solicitação'}
               </Button>
            </div>
         ) : (
            <div className="space-y-5 bg-white dark:bg-darkSurface p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-darkBorder">
               <div>
                  <input type="text" className={`w-full p-3.5 bg-gray-50 dark:bg-darkBg border rounded-xl text-darkText dark:text-darkTextPrimary ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-darkBorder'}`} placeholder="Nome Completo" value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value })} />
                  {errors.name && <p className="text-red-500 text-xs mt-1 font-bold ml-2">{errors.name}</p>}
               </div>
               <div>
                  <input type="email" className={`w-full p-3.5 bg-gray-50 dark:bg-darkBg border rounded-xl text-darkText dark:text-darkTextPrimary ${errors.email ? 'border-red-500' : 'border-gray-200 dark:border-darkBorder'}`} placeholder="E-mail" value={regData.email} onChange={e => setRegData({ ...regData, email: e.target.value })} />
                  {errors.email && <p className="text-red-500 text-xs mt-1 font-bold ml-2">{errors.email}</p>}
               </div>
               <div>
                  <input type="text" className={`w-full p-3.5 bg-gray-50 dark:bg-darkBg border rounded-xl text-darkText dark:text-darkTextPrimary ${errors.phone ? 'border-red-500' : 'border-gray-200 dark:border-darkBorder'}`} placeholder="Celular" value={regData.phone} onChange={e => setRegData({ ...regData, phone: e.target.value })} />
                  {errors.phone && <p className="text-red-500 text-xs mt-1 font-bold ml-2">{errors.phone}</p>}
               </div>
               <div>
                  <input type="password" className={`w-full p-3.5 bg-gray-50 dark:bg-darkBg border rounded-xl text-darkText dark:text-darkTextPrimary ${errors.password ? 'border-red-500' : 'border-gray-200 dark:border-darkBorder'}`} placeholder="Senha" value={regData.password} onChange={e => setRegData({ ...regData, password: e.target.value })} />
                  {errors.password && <p className="text-red-500 text-xs mt-1 font-bold ml-2">{errors.password}</p>}
               </div>

               <Button onClick={nextStep} disabled={isSubmitting} fullWidth className="mt-2 h-12" icon={isSubmitting ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}>
                  {isSubmitting ? 'Criando Conta...' : 'Finalizar e Criar Conta'}
               </Button>

               <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-darkBorder"></div></div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wider">
                     <span className="bg-white dark:bg-darkSurface px-4 text-gray-400 font-bold">Ou finalize com</span>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleSocialRegister('Google')} disabled={isSubmitting} className="flex items-center justify-center gap-2 p-3 border border-gray-200 dark:border-darkBorder rounded-xl bg-white dark:bg-darkBg hover:bg-gray-50 transition-colors text-sm font-bold text-gray-700 dark:text-gray-200 disabled:opacity-50">
                     <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                     Google
                  </button>
                  <button onClick={() => handleSocialRegister('Facebook')} disabled={isSubmitting} className="flex items-center justify-center gap-2 p-3 border border-gray-200 dark:border-darkBorder rounded-xl bg-white dark:bg-darkBg hover:bg-gray-50 transition-colors text-sm font-bold text-gray-700 dark:text-gray-200 disabled:opacity-50">
                     <Facebook size={20} className="text-[#1877F2]" fill="currentColor" />
                     Facebook
                  </button>
               </div>
            </div>
         )}
      </div>
   );

   const renderProgressBar = () => (
      <div className="mb-8">
         <div className="h-2 bg-gray-100 dark:bg-darkBorder rounded-full overflow-hidden">
            <div
               className="h-full bg-primary transition-all duration-500 ease-out"
               style={{ width: `${(step / totalSteps) * 100}%` }}
            />
         </div>
      </div>
   );

   return (
      <div className="min-h-screen bg-background dark:bg-darkBg font-sans flex flex-col transition-colors duration-300">
         <header className="bg-white dark:bg-darkSurface border-b border-gray-200 dark:border-darkBorder py-4">
            <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
               <button onClick={handleCancel} className="flex items-center gap-2 text-darkText dark:text-darkTextPrimary font-bold hover:text-primary">
                  <ArrowLeft size={20} /> Cancelar
               </button>
               <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Passo {step} de {totalSteps}</span>
               </div>
            </div>
         </header>

         <div className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8">
            {step < 6 && renderProgressBar()}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
            {step === 6 && !registrationSuccess && renderStep6()}

            {registrationSuccess && (
               <div className="max-w-md mx-auto text-center py-12 animate-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                     <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary mb-2">Solicitação Concluída!</h2>
                  <p className="text-lightText dark:text-darkTextSecondary mb-8">
                     Seu pedido foi recebido. {currentUser ? 'Você já pode acompanhar pelo seu painel.' : 'Verifique seu e-mail para confirmar a conta.'}
                  </p>
                  <Button onClick={() => navigate(currentUser ? '/client/dashboard' : '/')} fullWidth>Ir para o Início</Button>
               </div>
            )}

            {step < 5 && (
               <div className="mt-8 flex justify-between border-t border-gray-100 dark:border-darkBorder pt-6 mb-20 md:mb-0">
                  {step > 1 ? <button onClick={prevStep} className="text-lightText dark:text-darkTextSecondary font-bold text-sm flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button> : <div />}
                  <Button onClick={nextStep} className="px-8" disabled={(step === 1 && !selectedServiceId) || (step === 4 && !selectedDateStr)}>Continuar <ChevronRight size={18} /></Button>
               </div>
            )}
         </div>
      </div>
   );
};