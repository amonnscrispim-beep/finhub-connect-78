import { memo } from 'react';
import { StudyModule } from '@/types/study';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SharedBadge } from '@/components/ui/shared-badge';
import { useIsMaster } from '@/hooks/useIsMaster';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { 
  Target, PieChart, TrendingUp, Landmark, Building2, 
  LineChart, Globe, Bitcoin, BookOpen, Share2 
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  PieChart,
  TrendingUp,
  Landmark,
  Building2,
  LineChart,
  Globe,
  Bitcoin,
  BookOpen,
};

interface ModulesGridProps {
  modules: StudyModule[];
  isLoading: boolean;
  onModuleClick: (module: StudyModule) => void;
}

export const ModulesGrid = memo(function ModulesGrid({ modules, isLoading, onModuleClick }: ModulesGridProps) {
  const isMaster = useIsMaster();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const toggleShare = async (e: React.MouseEvent, module: StudyModule) => {
    e.stopPropagation();
    const newVal = !module.shared;
    await supabase.from('study_modules').update({ shared: newVal } as any).eq('id', module.id);

    // Also cascade share to submodules and slides of this module
    if (newVal) {
      await supabase.from('study_submodules').update({ shared: true } as any).eq('module_id', module.id);
      // Get submodule ids to share slides
      const { data: subs } = await supabase.from('study_submodules').select('id').eq('module_id', module.id);
      if (subs && subs.length > 0) {
        await supabase.from('study_slides').update({ shared: true } as any).in('submodule_id', subs.map(s => s.id));
      }
    } else {
      await supabase.from('study_submodules').update({ shared: false } as any).eq('module_id', module.id);
      const { data: subs } = await supabase.from('study_submodules').select('id').eq('module_id', module.id);
      if (subs && subs.length > 0) {
        await supabase.from('study_slides').update({ shared: false } as any).in('submodule_id', subs.map(s => s.id));
      }
    }

    queryClient.invalidateQueries({ queryKey: ['study-modules'] });
    toast.success(newVal ? 'Módulo compartilhado com todos!' : 'Compartilhamento removido.');
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {modules.map((module, index) => {
        const IconComponent = iconMap[module.icon] || BookOpen;
        const isShared = module.shared;
        const isOwnModule = module.userId === user?.id;
        
        return (
          <Card 
            key={module.id}
            className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200 group"
            onClick={() => onModuleClick(module)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <IconComponent className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      Módulo {index + 1}
                    </span>
                    {isShared && !isOwnModule && <SharedBadge />}
                  </div>
                  <CardTitle className="text-base leading-tight">
                    {module.title}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="line-clamp-2">
                {module.description || 'Clique para ver as aulas deste módulo'}
              </CardDescription>
              {isMaster && isOwnModule && (
                <Button
                  variant={isShared ? 'default' : 'outline'}
                  size="sm"
                  className="mt-2 text-xs h-7"
                  onClick={(e) => toggleShare(e, module)}
                >
                  <Share2 className="w-3 h-3 mr-1" />
                  {isShared ? 'Compartilhado' : 'Compartilhar'}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});
