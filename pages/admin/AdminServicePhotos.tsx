import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { useData } from '../../components/DataContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Camera, User, MapPin, Calendar, Clock, FileDown, CheckCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';

export const AdminServicePhotos: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { services } = useData();
    const service = services.find(s => s.id === id);

    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

    if (!service) {
        return (
            <Layout role={UserRole.ADMIN}>
                <div className="p-8 text-center text-lightText">Serviço não encontrado.</div>
            </Layout>
        );
    }

    const downloadPhoto = (base64: string, name: string) => {
        const link = document.createElement('a');
        link.href = base64;
        link.download = `${name}.png`;
        link.click();
    };

    const downloadAll = () => {
        service.photosBefore?.forEach((p, i) => downloadPhoto(p, `antes_${service.id}_${i}`));
        service.photosAfter?.forEach((p, i) => downloadPhoto(p, `depois_${service.id}_${i}`));
    };

    return (
        <Layout role={UserRole.ADMIN}>
            <div className="max-w-6xl mx-auto pb-20">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-darkText dark:text-darkTextPrimary" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">Evidências do Serviço</h1>
                        <p className="text-lightText dark:text-darkTextSecondary">ID #{service.id} • {service.clientName}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Infos Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-darkSurface p-6 rounded-2xl border border-gray-100 dark:border-darkBorder shadow-sm">
                            <h3 className="font-bold text-darkText dark:text-darkTextPrimary mb-4 flex items-center gap-2">
                                <InfoIcon /> Resumo
                            </h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex items-start gap-3">
                                    <User size={16} className="text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-darkText dark:text-darkTextPrimary">{service.clientName}</p>
                                        <p className="text-xs text-lightText dark:text-darkTextSecondary">Cliente</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-darkText dark:text-darkTextPrimary">{service.address}</p>
                                        <p className="text-xs text-lightText dark:text-darkTextSecondary">Endereço</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Calendar size={16} className="text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-darkText dark:text-darkTextPrimary">{service.date}</p>
                                        <p className="text-xs text-lightText dark:text-darkTextSecondary">Data</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle size={16} className="text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-darkText dark:text-darkTextPrimary">{service.collaboratorName || 'Não atribuído'}</p>
                                        <p className="text-xs text-lightText dark:text-darkTextSecondary">Responsável</p>
                                    </div>
                                </div>
                            </div>
                            <Button
                                fullWidth
                                className="mt-8 h-12"
                                variant="secondary"
                                onClick={downloadAll}
                                icon={<Download size={18} />}
                            >
                                Baixar Tudo (.zip)
                            </Button>
                        </div>
                    </div>

                    {/* Photos Column */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* ANTES */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2">
                                    <Camera size={20} className="text-primary" /> Antes da Limpeza
                                </h2>
                                <Badge variant="neutral">{service.photosBefore?.length || 0} fotos</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {service.photosBefore?.map((photo, i) => (
                                    <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-gray-100 dark:border-darkBorder bg-gray-50 dark:bg-darkBg shadow-sm cursor-zoom-in" onClick={() => setSelectedPhoto(photo)}>
                                        <img src={photo} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Antes" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); downloadPhoto(photo, `antes_${service.id}_${i}`); }}
                                                className="p-2 bg-white rounded-full text-darkText shadow-lg active:scale-95 transition-transform"
                                            >
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(!service.photosBefore || service.photosBefore.length === 0) && (
                                    <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-darkBg rounded-2xl border-2 border-dashed border-gray-200 dark:border-darkBorder text-lightText italic">
                                        Nenhuma foto do "Antes" disponível.
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* DEPOIS */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2">
                                    <CheckCircle size={20} className="text-green-500" /> Resultado Final (Depois)
                                </h2>
                                <Badge variant="neutral">{service.photosAfter?.length || 0} fotos</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {service.photosAfter?.map((photo, i) => (
                                    <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-gray-100 dark:border-darkBorder bg-gray-50 dark:bg-darkBg shadow-sm cursor-zoom-in" onClick={() => setSelectedPhoto(photo)}>
                                        <img src={photo} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Depois" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); downloadPhoto(photo, `depois_${service.id}_${i}`); }}
                                                className="p-2 bg-white rounded-full text-darkText shadow-lg active:scale-95 transition-transform"
                                            >
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(!service.photosAfter || service.photosAfter.length === 0) && (
                                    <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-darkBg rounded-2xl border-2 border-dashed border-gray-200 dark:border-darkBorder text-lightText italic">
                                        Nenhuma foto do "Depois" disponível.
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Photo Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in transition-opacity" onClick={() => setSelectedPhoto(null)}>
                    <img src={selectedPhoto} className="max-w-full max-h-[90vh] rounded-xl shadow-2xl animate-in zoom-in duration-300" alt="Full" />
                    <button className="absolute top-8 right-8 text-white hover:text-primary p-2 transition-colors">
                        <XIcon size={32} />
                    </button>
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                        <Button
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); downloadPhoto(selectedPhoto, 'servico_foto'); }}
                            icon={<Download size={20} />}
                        >
                            Baixar Imagem
                        </Button>
                    </div>
                </div>
            )}
        </Layout>
    );
};

const InfoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
);

const XIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
