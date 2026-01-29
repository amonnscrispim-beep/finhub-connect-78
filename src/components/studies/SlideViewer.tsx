import { useState, useRef } from 'react';
import { StudySubmodule, StudySlide } from '@/types/study';
import { useStudySlides } from '@/hooks/useStudyModules';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PDFViewer } from './PDFViewer';
import { 
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, 
  FileSliders, Upload, X, FileText, ImageIcon
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface SlideViewerProps {
  submodule: StudySubmodule;
  onBack: () => void;
}

export function SlideViewer({ submodule, onBack }: SlideViewerProps) {
  const { user } = useAuth();
  const { slides, slidesLoading, createSlide, updateSlide, deleteSlide } = useStudySlides(submodule.id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<StudySlide | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Editor form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formFileType, setFormFileType] = useState<'pdf' | 'image' | null>(null);
  const [formFileName, setFormFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSlide = slides[currentIndex];
  const hasSlides = slides.length > 0;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === slides.length - 1;

  const goNext = () => {
    if (!isLast) setCurrentIndex(i => i + 1);
  };

  const goPrev = () => {
    if (!isFirst) setCurrentIndex(i => i - 1);
  };

  const openEditor = (slide?: StudySlide) => {
    if (slide) {
      setEditingSlide(slide);
      setFormTitle(slide.title);
      setFormContent(slide.content || '');
      setFormFileUrl(slide.imageUrl || '');
      setFormFileType(slide.fileType);
      // Extract filename from URL if exists
      if (slide.imageUrl) {
        const parts = slide.imageUrl.split('/');
        setFormFileName(parts[parts.length - 1] || '');
      } else {
        setFormFileName('');
      }
    } else {
      setEditingSlide(null);
      setFormTitle('');
      setFormContent('');
      setFormFileUrl('');
      setFormFileType(null);
      setFormFileName('');
    }
    setIsEditorOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    
    if (!isPdf && !isImage) {
      toast.error('Apenas arquivos PDF ou imagens são permitidos.');
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create unique filename with user folder for RLS
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('slide-files')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('slide-files')
        .getPublicUrl(data.path);

      setFormFileUrl(urlData.publicUrl);
      setFormFileType(isPdf ? 'pdf' : 'image');
      setFormFileName(file.name);
      toast.success('Arquivo enviado com sucesso!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar arquivo: ' + error.message);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    setFormFileUrl('');
    setFormFileType(null);
    setFormFileName('');
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;

    if (editingSlide) {
      updateSlide.mutate({
        id: editingSlide.id,
        title: formTitle.trim(),
        content: formContent.trim() || undefined,
        imageUrl: formFileUrl.trim() || undefined,
        fileType: formFileType,
      }, {
        onSuccess: () => setIsEditorOpen(false)
      });
    } else {
      createSlide.mutate({
        title: formTitle.trim(),
        content: formContent.trim() || undefined,
        imageUrl: formFileUrl.trim() || undefined,
        fileType: formFileType,
      }, {
        onSuccess: () => {
          setIsEditorOpen(false);
          setCurrentIndex(slides.length);
        }
      });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteSlide.mutate(deletingId, {
      onSuccess: () => {
        setDeletingId(null);
        if (currentIndex >= slides.length - 1 && currentIndex > 0) {
          setCurrentIndex(i => i - 1);
        }
      }
    });
  };

  if (slidesLoading) {
    return (
      <Card className="min-h-[500px]">
        <CardContent className="p-8">
          <Skeleton className="h-8 w-1/2 mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {hasSlides && (
            <span>Slide {currentIndex + 1} de {slides.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentSlide && (
            <>
              <Button size="sm" variant="outline" onClick={() => openEditor(currentSlide)}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDeletingId(currentSlide.id)}>
                <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                Excluir
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => openEditor()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Slide
          </Button>
        </div>
      </div>

      {/* Slide viewer */}
      {!hasSlides ? (
        <Card className="min-h-[500px] flex flex-col items-center justify-center">
          <FileSliders className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhum slide ainda</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Clique em "Novo Slide" para começar a criar sua apresentação.
          </p>
          <Button onClick={() => openEditor()}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Slide
          </Button>
        </Card>
      ) : (
        <Card className="min-h-[500px]">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-xl">{currentSlide.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {/* File (PDF or Image) */}
            {currentSlide.imageUrl && (
              <div className="mb-6">
                {currentSlide.fileType === 'pdf' ? (
                  <PDFViewer 
                    pdfUrl={currentSlide.imageUrl} 
                    title={currentSlide.title}
                  />
                ) : (
                  <div className="flex justify-center">
                    <img 
                      src={currentSlide.imageUrl} 
                      alt={currentSlide.title}
                      className="max-h-64 rounded-lg shadow-md"
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Content */}
            {currentSlide.content && (
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {currentSlide.content}
              </div>
            )}

            {!currentSlide.content && !currentSlide.imageUrl && (
              <div className="text-center text-muted-foreground py-12">
                <p>Este slide está vazio. Clique em "Editar" para adicionar conteúdo.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {hasSlides && (
        <div className="flex items-center justify-center gap-4">
          <Button 
            variant="outline" 
            onClick={goPrev} 
            disabled={isFirst}
            className="min-w-[120px]"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>
          
          {/* Slide dots */}
          <div className="flex items-center gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          <Button 
            variant="outline" 
            onClick={goNext} 
            disabled={isLast}
            className="min-w-[120px]"
          >
            Próximo
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Slide editor dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSlide ? 'Editar Slide' : 'Novo Slide'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="slide-title">Título</Label>
              <Input
                id="slide-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Título do slide..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slide-content">Conteúdo</Label>
              <Textarea
                id="slide-content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Conteúdo do slide (suporta múltiplas linhas)..."
                rows={8}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Arquivo do Slide (PDF ou Imagem)
              </Label>
              
              {formFileUrl ? (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                  {formFileType === 'pdf' ? (
                    <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{formFileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formFileType === 'pdf' ? 'Documento PDF' : 'Imagem'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isUploading ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
                  }`}>
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Clique ou arraste para enviar
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          PDF ou imagem (máx. 10MB)
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formTitle.trim() || createSlide.isPending || updateSlide.isPending || isUploading}
            >
              {createSlide.isPending || updateSlide.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir slide?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
