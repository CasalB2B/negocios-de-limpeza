import React, { useState, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Plus, ArrowRight, X, Camera } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../components/DataContext';

export const ServicePhotos: React.FC = () => {
   const navigate = useNavigate();
   const { id } = useParams();
   const { updateServiceStatus } = useData();

   const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
   const [afterPhotos, setAfterPhotos] = useState<string[]>([]);

   const beforeInputRef = useRef<HTMLInputElement>(null);
   const afterInputRef = useRef<HTMLInputElement>(null);

   const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onload = () => resolve(reader.result as string);
         reader.onerror = error => reject(error);
      });
   };

   const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
      if (e.target.files && e.target.files[0]) {
         const file = e.target.files[0];
         try {
            const base64 = await fileToBase64(file);
            if (type === 'before') {
               setBeforePhotos([...beforePhotos, base64]);
            } else {
               setAfterPhotos([...afterPhotos, base64]);
            }
         } catch (err) {
            console.error("Erro ao processar imagem:", err);
         }
      }
   };

   const removePhoto = (type: 'before' | 'after', index: number) => {
      if (type === 'before') {
         setBeforePhotos(beforePhotos.filter((_, i) => i !== index));
      } else {
         setAfterPhotos(afterPhotos.filter((_, i) => i !== index));
      }
   };

   const handleContinue = async () => {
      if (id) {
         await updateServiceStatus(id, 'COMPLETED', {
            photosBefore: beforePhotos,
            photosAfter: afterPhotos
         });
      }

      navigate(`/collab/service/${id}/checkout`);
   };

   return (
      <Layout role={UserRole.COLLABORATOR}>
         <div className="max-w-4xl mx-auto pb-20">
            <div className="flex items-center gap-2 text-sm text-lightText mb-6">
               <span>Portal da Colaboradora</span>
               <span>/</span>
               <span className="text-darkText font-bold">Fotos do Serviço</span>
            </div>

            <h1 className="text-3xl font-display font-bold text-darkText mb-2">Fotos do Serviço</h1>
            <p className="text-lightText mb-8 max-w-2xl">Registre o progresso do seu trabalho enviando fotos do antes e depois. Isso garante a qualidade e segurança do seu serviço.</p>

            {/* Hidden Inputs */}
            <input type="file" ref={beforeInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'before')} />
            <input type="file" ref={afterInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'after')} />

            {/* ANTES Section */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm mb-8">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-darkText">Antes</h2>
                  <span className="text-xs bg-gray-100 text-lightText px-2 py-1 rounded font-bold">{beforePhotos.length}/3 fotos</span>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {beforePhotos.map((photo, idx) => (
                     <div key={idx} className="aspect-square rounded-2xl relative overflow-hidden group border border-gray-200">
                        <img src={photo} className="w-full h-full object-cover" alt="Antes" />
                        <button
                           onClick={() => removePhoto('before', idx)}
                           className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                           <X size={14} />
                        </button>
                     </div>
                  ))}
                  {beforePhotos.length < 3 && (
                     <button
                        onClick={() => beforeInputRef.current?.click()}
                        className="aspect-square rounded-2xl border-2 border-dashed border-primary/30 bg-purple-50/30 flex flex-col items-center justify-center gap-2 text-primary hover:bg-purple-50 transition-colors group"
                     >
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                           <Plus size={24} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">Adicionar</span>
                     </button>
                  )}
               </div>
            </div>

            {/* DEPOIS Section */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm mb-12">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-darkText">Depois</h2>
                  <span className="text-xs bg-gray-100 text-lightText px-2 py-1 rounded font-bold">{afterPhotos.length}/3 fotos</span>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {afterPhotos.map((photo, idx) => (
                     <div key={idx} className="aspect-square rounded-2xl relative overflow-hidden group border border-gray-200">
                        <img src={photo} className="w-full h-full object-cover" alt="Depois" />
                        <button
                           onClick={() => removePhoto('after', idx)}
                           className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                           <X size={14} />
                        </button>
                     </div>
                  ))}
                  {afterPhotos.length < 3 && (
                     <button
                        onClick={() => afterInputRef.current?.click()}
                        className="aspect-square rounded-2xl border-2 border-dashed border-primary/30 bg-purple-50/30 flex flex-col items-center justify-center gap-2 text-primary hover:bg-purple-50 transition-colors group"
                     >
                        <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                           <Plus size={24} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">Adicionar</span>
                     </button>
                  )}
               </div>
            </div>

            <Button
               fullWidth
               className="h-14 shadow-xl shadow-primary/20 text-lg"
               icon={<ArrowRight size={22} />}
               onClick={handleContinue}
            >
               Continuar
            </Button>

            <p className="text-center text-xs text-lightText mt-4">Ao clicar em continuar, você confirma que as imagens enviadas correspondem ao local do serviço.</p>
         </div>
      </Layout>
   );
};