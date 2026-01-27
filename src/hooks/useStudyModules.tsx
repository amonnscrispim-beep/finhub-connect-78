import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StudyModule, StudySubmodule, StudySlide, DEFAULT_MODULES } from '@/types/study';
import { toast } from 'sonner';

// Transform DB row to StudyModule
const transformModule = (row: any): StudyModule => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  description: row.description,
  icon: row.icon || 'BookOpen',
  displayOrder: row.display_order,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const transformSubmodule = (row: any): StudySubmodule => ({
  id: row.id,
  moduleId: row.module_id,
  userId: row.user_id,
  title: row.title,
  displayOrder: row.display_order,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const transformSlide = (row: any): StudySlide => ({
  id: row.id,
  submoduleId: row.submodule_id,
  userId: row.user_id,
  title: row.title,
  content: row.content,
  imageUrl: row.image_url,
  fileType: row.file_type as 'pdf' | 'image' | null,
  displayOrder: row.display_order,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export function useStudyModules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // Fetch all modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['study-modules', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('study_modules')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(transformModule);
    },
    enabled: !!userId,
  });

  // Initialize default modules if empty
  const initializeDefaultModules = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not authenticated');
      
      const modulesToInsert = DEFAULT_MODULES.map((mod, index) => ({
        user_id: userId,
        title: mod.title,
        description: mod.description,
        icon: mod.icon,
        display_order: index + 1,
      }));

      const { error } = await supabase
        .from('study_modules')
        .insert(modulesToInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-modules', userId] });
      toast.success('Módulos padrão criados com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar módulos: ' + error.message);
    },
  });

  // Create module
  const createModule = useMutation({
    mutationFn: async (data: { title: string; description?: string; icon?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const maxOrder = modules.length > 0 ? Math.max(...modules.map(m => m.displayOrder)) : 0;
      
      const { error } = await supabase
        .from('study_modules')
        .insert({
          user_id: userId,
          title: data.title,
          description: data.description || null,
          icon: data.icon || 'BookOpen',
          display_order: maxOrder + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-modules', userId] });
      toast.success('Módulo criado!');
    },
    onError: (error) => {
      toast.error('Erro ao criar módulo: ' + error.message);
    },
  });

  // Update module
  const updateModule = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string; icon?: string }) => {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.icon !== undefined) updateData.icon = data.icon;

      const { error } = await supabase
        .from('study_modules')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-modules', userId] });
      toast.success('Módulo atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar módulo: ' + error.message);
    },
  });

  // Delete module
  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('study_modules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-modules', userId] });
      toast.success('Módulo excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir módulo: ' + error.message);
    },
  });

  return {
    modules,
    modulesLoading,
    initializeDefaultModules,
    createModule,
    updateModule,
    deleteModule,
  };
}

export function useStudySubmodules(moduleId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: submodules = [], isLoading: submodulesLoading } = useQuery({
    queryKey: ['study-submodules', moduleId],
    queryFn: async () => {
      if (!moduleId || !userId) return [];
      const { data, error } = await supabase
        .from('study_submodules')
        .select('*')
        .eq('module_id', moduleId)
        .eq('user_id', userId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(transformSubmodule);
    },
    enabled: !!moduleId && !!userId,
  });

  const createSubmodule = useMutation({
    mutationFn: async (data: { title: string }) => {
      if (!userId || !moduleId) throw new Error('Not authenticated or no module selected');
      
      const maxOrder = submodules.length > 0 ? Math.max(...submodules.map(s => s.displayOrder)) : 0;
      
      const { error } = await supabase
        .from('study_submodules')
        .insert({
          module_id: moduleId,
          user_id: userId,
          title: data.title,
          display_order: maxOrder + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-submodules', moduleId] });
      toast.success('Aula criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar aula: ' + error.message);
    },
  });

  const updateSubmodule = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from('study_submodules')
        .update({ title })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-submodules', moduleId] });
      toast.success('Aula atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar aula: ' + error.message);
    },
  });

  const deleteSubmodule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('study_submodules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-submodules', moduleId] });
      toast.success('Aula excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir aula: ' + error.message);
    },
  });

  return {
    submodules,
    submodulesLoading,
    createSubmodule,
    updateSubmodule,
    deleteSubmodule,
  };
}

export function useStudySlides(submoduleId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: slides = [], isLoading: slidesLoading } = useQuery({
    queryKey: ['study-slides', submoduleId],
    queryFn: async () => {
      if (!submoduleId || !userId) return [];
      const { data, error } = await supabase
        .from('study_slides')
        .select('*')
        .eq('submodule_id', submoduleId)
        .eq('user_id', userId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(transformSlide);
    },
    enabled: !!submoduleId && !!userId,
  });

  const createSlide = useMutation({
    mutationFn: async (data: { title: string; content?: string; imageUrl?: string; fileType?: 'pdf' | 'image' | null }) => {
      if (!userId || !submoduleId) throw new Error('Not authenticated or no submodule selected');
      
      const maxOrder = slides.length > 0 ? Math.max(...slides.map(s => s.displayOrder)) : 0;
      
      const { error } = await supabase
        .from('study_slides')
        .insert({
          submodule_id: submoduleId,
          user_id: userId,
          title: data.title,
          content: data.content || null,
          image_url: data.imageUrl || null,
          file_type: data.fileType || null,
          display_order: maxOrder + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-slides', submoduleId] });
      toast.success('Slide criado!');
    },
    onError: (error) => {
      toast.error('Erro ao criar slide: ' + error.message);
    },
  });

  const updateSlide = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; content?: string; imageUrl?: string; fileType?: 'pdf' | 'image' | null }) => {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
      if (data.fileType !== undefined) updateData.file_type = data.fileType;

      const { error } = await supabase
        .from('study_slides')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-slides', submoduleId] });
      toast.success('Slide atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar slide: ' + error.message);
    },
  });

  const deleteSlide = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('study_slides')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-slides', submoduleId] });
      toast.success('Slide excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir slide: ' + error.message);
    },
  });

  return {
    slides,
    slidesLoading,
    createSlide,
    updateSlide,
    deleteSlide,
  };
}
