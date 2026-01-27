import { useState } from 'react';
import { StudyModule, StudySubmodule } from '@/types/study';
import { useStudySubmodules } from '@/hooks/useStudyModules';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, Play, Pencil, Trash2, Check, X, 
  GripVertical, BookOpen 
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

interface ModuleDetailProps {
  module: StudyModule;
  onSubmoduleClick: (submodule: StudySubmodule) => void;
}

export function ModuleDetail({ module, onSubmoduleClick }: ModuleDetailProps) {
  const { submodules, submodulesLoading, createSubmodule, updateSubmodule, deleteSubmodule } = useStudySubmodules(module.id);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createSubmodule.mutate({ title: newTitle.trim() }, {
      onSuccess: () => {
        setNewTitle('');
        setIsAdding(false);
      }
    });
  };

  const handleUpdate = (id: string) => {
    if (!editingTitle.trim()) return;
    updateSubmodule.mutate({ id, title: editingTitle.trim() }, {
      onSuccess: () => {
        setEditingId(null);
        setEditingTitle('');
      }
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteSubmodule.mutate(deletingId, {
      onSuccess: () => setDeletingId(null)
    });
  };

  const startEditing = (submodule: StudySubmodule) => {
    setEditingId(submodule.id);
    setEditingTitle(submodule.title);
  };

  if (submodulesLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Aula
        </Button>
      </div>

      {/* Add form */}
      {isAdding && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Título da aula..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <Button size="icon" onClick={handleAdd} disabled={createSubmodule.isPending}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { setIsAdding(false); setNewTitle(''); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submodules list */}
      {submodules.length === 0 && !isAdding ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-medium text-foreground">Nenhuma aula ainda</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Clique em "Nova Aula" para adicionar conteúdo a este módulo.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {submodules.map((submodule, index) => (
            <Card 
              key={submodule.id}
              className="group hover:shadow-sm transition-shadow"
            >
              <CardContent className="p-4">
                {editingId === submodule.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(submodule.id)}
                      autoFocus
                    />
                    <Button size="icon" onClick={() => handleUpdate(submodule.id)} disabled={updateSubmodule.isPending}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                    <span className="text-sm font-medium text-muted-foreground w-8">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <button 
                      className="flex-1 text-left font-medium text-foreground hover:text-primary transition-colors"
                      onClick={() => onSubmoduleClick(submodule)}
                    >
                      {submodule.title}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" onClick={() => onSubmoduleClick(submodule)}>
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => startEditing(submodule)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeletingId(submodule.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aula?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os slides desta aula serão excluídos.
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
