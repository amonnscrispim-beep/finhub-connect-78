import { useState } from 'react';
import { PainelEntrada } from './PainelEntrada';
import { PreviewRelatorio } from './PreviewRelatorio';
import { WhatsAppModal } from './WhatsAppModal';

export function GeradorResumos() {
  const [reportMarkdown, setReportMarkdown] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [clientName, setClientName] = useState('');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[70vh]">
        {/* Left Panel - 40% */}
        <div className="lg:col-span-2">
          <PainelEntrada
            onReportGenerated={setReportMarkdown}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            uploadedImages={uploadedImages}
            setUploadedImages={setUploadedImages}
            clientName={clientName}
            setClientName={setClientName}
          />
        </div>

        {/* Right Panel - 60% */}
        <div className="lg:col-span-3">
          <PreviewRelatorio
            markdown={reportMarkdown}
            isGenerating={isGenerating}
            images={uploadedImages}
            onOpenWhatsApp={() => setWhatsAppModalOpen(true)}
          />
        </div>
      </div>

      <WhatsAppModal
        open={whatsAppModalOpen}
        onOpenChange={setWhatsAppModalOpen}
        reportMarkdown={reportMarkdown}
        clientName={clientName}
      />
    </div>
  );
}
