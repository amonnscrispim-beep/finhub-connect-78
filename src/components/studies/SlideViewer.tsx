import { useState } from 'react';
import { StudySubmodule, StudySlide } from '@/types/study';
import { useStudySlides } from '@/hooks/useStudyModules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, 
  Check, X, FileSliders, Image
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

interface SlideViewerProps {
  submodule: StudySubmodule;
  onBack: () => void;
}

export function SlideViewer({ submodule, onBack }: SlideViewerProps) {
  const { slides, slidesLoading, createSlide, updateSlide, deleteSlide } = useStudySlides(submodule.id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<StudySlide | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Editor form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');

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
      setFormImageUrl(slide.imageUrl || '');
    } else {
      setEditingSlide(null);
      setFormTitle('');
      setFormContent('');
      setFormImageUrl('');
    }
    setIsEditorOpen(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;

    if (editingSlide) {
      updateSlide.mutate({
        id: editingSlide.id,
        title: formTitle.trim(),
        content: formContent.trim() || undefined,
        imageUrl: formImageUrl.trim() || undefined,
      }, {
        onSuccess: () => setIsEditorOpen(false)
      });
    } else {
      createSlide.mutate({
        title: formTitle.trim(),
        content: formContent.trim() || undefined,
        imageUrl: formImageUrl.trim() || undefined,
      }, {
        onSuccess: () => {
          setIsEditorOpen(false);
          setCurrentIndex(slides.length); // Go to new slide
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
            <>
              <span>Slide {currentIndex + 1} de {slides.length}</span>
            </>
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
            {/* Image */}
            {currentSlide.imageUrl && (
              <div className="mb-6 flex justify-center">
                <img 
                  src={currentSlide.imageUrl} 
                  alt={currentSlide.title}
                  className="max-h-64 rounded-lg shadow-md"
                />
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
              <Label htmlFor="slide-image" className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                URL da Imagem (opcional)
              </Label>
              <Input
                id="slide-image"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formTitle.trim() || createSlide.isPending || updateSlide.isPending}
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
