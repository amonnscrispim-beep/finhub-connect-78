import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Folder, Upload, Download, Trash2, File, FileText, Image, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientFile, FileFolder, FILE_FOLDERS } from '@/types/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface ClientFilesProps {
  files: ClientFile[];
  onFilesChange: (files: ClientFile[]) => void;
  clientId?: string;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="w-4 h-4 text-primary" />;
  if (type.includes('pdf')) return <FileText className="w-4 h-4 text-destructive" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';

const sanitizeName = (name: string) => {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'arquivo';
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
  return ext ? `${base}.${ext}` : base;
};

export function ClientFiles({ files, onFilesChange, clientId }: ClientFilesProps) {
  const { user } = useAuth();
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);
  const [uploading, setUploading] = useState(0);
  const [activeFolder, setActiveFolder] = useState<FileFolder>('documentos');
  const [dragOver, setDragOver] = useState(false);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ClientFile | null>(null);

  const getFilesByFolder = (folder: FileFolder) => {
    return files.filter(f => f.folder === folder);
  };

  const handleFileUpload = useCallback(async (uploadedFiles: FileList | null, folder: FileFolder) => {
    if (!uploadedFiles || !uploadedFiles.length) return;
    if (!user) { toast.error('Faça login para enviar arquivos.'); return; }
    const list = Array.from(uploadedFiles);
    setUploading(n => n + list.length);
    for (const file of list) {
      try {
        const path = `${user.id}/${clientId || 'sem-cliente'}/${Date.now()}_${sanitizeName(file.name)}`;
        const { error } = await supabase.storage.from('client-files').upload(path, file, { contentType: file.type || undefined });
        if (error) throw error;
        const newFile: ClientFile = {
          id: generateId(), name: file.name, type: file.type, size: file.size,
          folder, uploadedAt: new Date(), storagePath: path,
        };
        filesRef.current = [...filesRef.current, newFile];
        onFilesChange(filesRef.current);
      } catch (err) {
        console.error('Upload error:', err);
        toast.error(`Erro ao enviar "${file.name}".`);
      } finally {
        setUploading(n => n - 1);
      }
    }
  }, [user, clientId, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent, folder: FileFolder) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files, folder);
  }, [handleFileUpload]);

  const handleDownload = async (file: ClientFile) => {
    let href = file.dataUrl || '';
    let revoke = false;
    if (file.storagePath) {
      const { data, error } = await supabase.storage.from('client-files').download(file.storagePath);
      if (error || !data) { toast.error('Erro ao baixar arquivo.'); return; }
      href = URL.createObjectURL(data);
      revoke = true;
    }
    if (!href) return;
    const link = document.createElement('a');
    link.href = href;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  const handleDelete = (file: ClientFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      onFilesChange(files.filter(f => f.id !== fileToDelete.id));
      if (fileToDelete.storagePath) {
        supabase.storage.from('client-files').remove([fileToDelete.storagePath]).then(({ error }) => {
          if (error) console.error('Storage delete error:', error);
        });
      }
    }
    setDeleteDialogOpen(false);
    setFileToDelete(null);
  };

  const handleRename = (fileId: string) => {
    if (newName.trim()) {
      onFilesChange(files.map(f => 
        f.id === fileId ? { ...f, name: newName.trim() } : f
      ));
    }
    setRenamingFile(null);
    setNewName('');
  };

  const startRename = (file: ClientFile) => {
    setRenamingFile(file.id);
    setNewName(file.name);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Folder className="w-5 h-5" />
        Arquivos do Cliente
        {uploading > 0 && <span className="text-xs font-normal text-muted-foreground">Enviando {uploading}...</span>}
      </h3>

      <Tabs value={activeFolder} onValueChange={(v) => setActiveFolder(v as FileFolder)}>
        <TabsList className="grid w-full grid-cols-3">
          {FILE_FOLDERS.map((folder) => {
            const count = getFilesByFolder(folder.value).length;
            return (
              <TabsTrigger key={folder.value} value={folder.value} className="gap-2">
                <Folder className="w-4 h-4" />
                {folder.label}
                {count > 0 && (
                  <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {FILE_FOLDERS.map((folder) => (
          <TabsContent key={folder.value} value={folder.value} className="mt-4">
            {/* Drop Zone */}
            <div
              onDrop={(e) => handleDrop(e, folder.value)}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Arraste arquivos aqui ou
              </p>
              <label>
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files, folder.value)}
                />
                <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                  <span>Escolher Arquivos</span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                PDF, JPG, PNG, DOC, DOCX, XLS, XLSX
              </p>
            </div>

            {/* File List */}
            <div className="mt-4 space-y-2">
              {getFilesByFolder(folder.value).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum arquivo nesta pasta
                </p>
              ) : (
                getFilesByFolder(folder.value).map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    {getFileIcon(file.type)}
                    
                    <div className="flex-1 min-w-0">
                      {renamingFile === file.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="h-7 text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleRename(file.id)}
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleRename(file.id)}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setRenamingFile(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)} • {format(new Date(file.uploadedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </>
                      )}
                    </div>

                    {renamingFile !== file.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(file)}
                          title="Baixar"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startRename(file)}
                          title="Renomear"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDelete(file);
                          }}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Arquivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{fileToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                confirmDelete();
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}