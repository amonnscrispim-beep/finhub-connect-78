import { memo } from 'react';
import { StudyModule } from '@/types/study';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, PieChart, TrendingUp, Landmark, Building2, 
  LineChart, Globe, Bitcoin, BookOpen 
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
                  <div className="text-xs text-muted-foreground font-medium mb-1">
                    Módulo {index + 1}
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});
