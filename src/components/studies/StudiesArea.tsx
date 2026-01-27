import { useState } from 'react';
import { useStudyModules } from '@/hooks/useStudyModules';
import { ModulesGrid } from './ModulesGrid';
import { ModuleDetail } from './ModuleDetail';
import { SlideViewer } from './SlideViewer';
import { StudyModule, StudySubmodule } from '@/types/study';
import { ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewState = 
  | { type: 'modules' }
  | { type: 'module-detail'; module: StudyModule }
  | { type: 'slide-viewer'; module: StudyModule; submodule: StudySubmodule };

export function StudiesArea() {
  const [viewState, setViewState] = useState<ViewState>({ type: 'modules' });
  const { modules, modulesLoading, initializeDefaultModules } = useStudyModules();

  const handleModuleClick = (module: StudyModule) => {
    setViewState({ type: 'module-detail', module });
  };

  const handleSubmoduleClick = (submodule: StudySubmodule) => {
    if (viewState.type === 'module-detail') {
      setViewState({ type: 'slide-viewer', module: viewState.module, submodule });
    }
  };

  const handleBack = () => {
    if (viewState.type === 'slide-viewer') {
      setViewState({ type: 'module-detail', module: viewState.module });
    } else if (viewState.type === 'module-detail') {
      setViewState({ type: 'modules' });
    }
  };

  // Show initialize button if no modules exist
  const showInitialize = !modulesLoading && modules.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {viewState.type !== 'modules' && (
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {viewState.type === 'modules' && 'Área de Estudos'}
              {viewState.type === 'module-detail' && viewState.module.title}
              {viewState.type === 'slide-viewer' && viewState.submodule.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {viewState.type === 'modules' && 'Conteúdos educacionais sobre investimentos'}
              {viewState.type === 'module-detail' && viewState.module.description}
              {viewState.type === 'slide-viewer' && `${viewState.module.title}`}
            </p>
          </div>
        </div>
      </div>

      {/* Content based on view state */}
      {viewState.type === 'modules' && (
        <>
          {showInitialize ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <BookOpen className="w-16 h-16 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold text-foreground">Nenhum módulo encontrado</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Clique no botão abaixo para criar os 8 módulos padrão do curso de investimentos.
              </p>
              <Button 
                onClick={() => initializeDefaultModules.mutate()}
                disabled={initializeDefaultModules.isPending}
              >
                {initializeDefaultModules.isPending ? 'Criando...' : 'Criar Módulos Padrão'}
              </Button>
            </div>
          ) : (
            <ModulesGrid 
              modules={modules} 
              isLoading={modulesLoading} 
              onModuleClick={handleModuleClick} 
            />
          )}
        </>
      )}

      {viewState.type === 'module-detail' && (
        <ModuleDetail 
          module={viewState.module} 
          onSubmoduleClick={handleSubmoduleClick}
        />
      )}

      {viewState.type === 'slide-viewer' && (
        <SlideViewer 
          submodule={viewState.submodule}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
