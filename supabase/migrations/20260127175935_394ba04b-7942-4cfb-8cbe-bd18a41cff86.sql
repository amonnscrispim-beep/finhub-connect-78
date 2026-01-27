-- Create study modules table
CREATE TABLE public.study_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'BookOpen',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create study submodules (lessons) table
CREATE TABLE public.study_submodules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.study_modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create study slides table
CREATE TABLE public.study_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submodule_id UUID NOT NULL REFERENCES public.study_submodules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_submodules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_slides ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_modules
CREATE POLICY "Users can view own modules" ON public.study_modules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own modules" ON public.study_modules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own modules" ON public.study_modules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own modules" ON public.study_modules FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for study_submodules
CREATE POLICY "Users can view own submodules" ON public.study_submodules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own submodules" ON public.study_submodules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own submodules" ON public.study_submodules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own submodules" ON public.study_submodules FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for study_slides
CREATE POLICY "Users can view own slides" ON public.study_slides FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own slides" ON public.study_slides FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own slides" ON public.study_slides FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own slides" ON public.study_slides FOR DELETE USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_study_modules_updated_at BEFORE UPDATE ON public.study_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_submodules_updated_at BEFORE UPDATE ON public.study_submodules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_slides_updated_at BEFORE UPDATE ON public.study_slides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_study_modules_user_id ON public.study_modules(user_id);
CREATE INDEX idx_study_submodules_module_id ON public.study_submodules(module_id);
CREATE INDEX idx_study_slides_submodule_id ON public.study_slides(submodule_id);