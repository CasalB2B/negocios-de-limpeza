import React, { useState, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Plus, ArrowRight, X, Loader } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../components/DataContext';
import { supabase } from '../../lib/supabase';

interface PhotoEntry { preview: string; file: File; }

export const ServicePhotos: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { updateServiceStatus } = useData();

  const [beforePhotos, setBeforePhotos] = useState<PhotoEntry[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<PhotoEntry[]>([]);
  const [uploading, setUploading] = useState(false);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const preview = URL.createObjectURL(file);
    if (type === 'before') setBeforePhotos(prev => [...prev, { preview, file }]);
    else setAfterPhotos(prev => [...prev, { preview, file }]);
    e.target.value = '';
  };

  const removePhoto = (type: 'before' | 'after', index: number) => {
    if (type === 'before') setBeforePhotos(prev => prev.filter((_, i) => i !== index));
    else setAfterPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File, type: 'before' | 'after', index: number): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${id}/${type}_${index}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('service-photos').upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from('service-photos').getPublicUrl(path).data.publicUrl;
  };

  const handleContinue = async () => {
    setUploading(true);
    try {
      const beforeUrls = await Promise.all(beforePhotos.map((p, i) => uploadFile(p.file, 'before', i)));
      const afterUrls = await Promise.all(afterPhotos.map((p, i) => uploadFile(p.file, 'after', i)));
      if (id && (beforeUrls.length > 0 || afterUrls.length > 0)) {
        await updateServiceStatus(id, 'IN_PROGRESS', { photos: { before: beforeUrls, after: afterUrls } });
      }
    } catch (err) {
      console.error('Erro no upload:', err);
    } finally {
      setUploading(false);
      navigate(`/collab/service/${id}/checkout`);
    }
  };

  const PhotoGrid = ({ photos, type }: { photos: PhotoEntry[]; type: 'before' | 'after' }) => {
    const inputRef = type === 'before' ? beforeInputRef : afterInputRef;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {photos.map((photo, idx) => (
          <div key={idx} className="aspect-square rounded-2xl relative overflow-hidden group border border-gray-200">
            <img src={photo.preview} className="w-full h-full object-cover" alt={type} />
            <button onClick={() => removePhoto(type, idx)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={14} />
            </button>
          </div>
        ))}
        {photos.length < 3 && (
          <button onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-2xl border-2 border-dashed border-primary/30 bg-purple-50/30 flex flex-col items-center justify-center gap-2 text-primary hover:bg-purple-50 transition-colors group">
            <div className={`w-10 h-10 ${type === 'before' ? 'bg-primary' : 'bg-primary/20'} rounded-full flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
              <Plus size={24} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Adicionar</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <Layout role={UserRole.COLLABORATOR}>
      <div className="max-w-4xl mx-auto pb-20">
        <div className="flex items-center gap-2 text-sm text-lightText mb-6">
          <span>Portal da Colaboradora</span><span>/</span>
          <span className="text-darkText font-bold">Fotos do Serviço</span>
        </div>

        <h1 className="text-3xl font-display font-bold text-darkText mb-2">Fotos do Serviço</h1>
        <p className="text-lightText mb-8 max-w-2xl">Registre o progresso enviando fotos do antes e depois. As fotos são salvas no sistema automaticamente.</p>

        <input type="file" ref={beforeInputRef} className="hidden" accept="image/*" capture="environment" onChange={e => handlePhotoSelect(e, 'before')} />
        <input type="file" ref={afterInputRef} className="hidden" accept="image/*" capture="environment" onChange={e => handlePhotoSelect(e, 'after')} />

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-darkText">Antes</h2>
            <span className="text-xs bg-gray-100 text-lightText px-2 py-1 rounded font-bold">{beforePhotos.length}/3 fotos</span>
          </div>
          <PhotoGrid photos={beforePhotos} type="before" />
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-darkText">Depois</h2>
            <span className="text-xs bg-gray-100 text-lightText px-2 py-1 rounded font-bold">{afterPhotos.length}/3 fotos</span>
          </div>
          <PhotoGrid photos={afterPhotos} type="after" />
        </div>

        <Button fullWidth className="h-14 shadow-xl shadow-primary/20 text-lg"
          icon={uploading ? <Loader size={22} className="animate-spin" /> : <ArrowRight size={22} />}
          onClick={handleContinue} disabled={uploading}>
          {uploading ? 'Salvando fotos...' : 'Continuar'}
        </Button>

        <p className="text-center text-xs text-lightText mt-4">
          {beforePhotos.length + afterPhotos.length === 0
            ? 'Fotos são opcionais. Clique em Continuar para prosseguir sem fotos.'
            : 'As fotos serão enviadas ao clicar em Continuar.'}
        </p>
      </div>
    </Layout>
  );
};
