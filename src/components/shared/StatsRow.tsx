import { useSuiteStore } from '../../stores/suiteStore';
import { Image, FileText, Activity } from 'lucide-react';

const StatsRow = () => {
    const { dataset } = useSuiteStore();

    // Calculate real stats from the store
    const imageCount = dataset.filter(i => i.type === 'image').length;
    const textCount = dataset.filter(i => i.type === 'text').length;
    const otherCount = dataset.filter(i => i.type !== 'image' && i.type !== 'text').length;

    // Simulate load based on dataset size for realism (or use store isProcessing state)
    const loadPercentage = Math.min(100, Math.floor(20 + (dataset.length * 2)));

    return (
        <div className="px-8 pt-6 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Visual Corpus */}
                <div className="deep-panel p-6 flex items-center justify-between">
                    <div>
                        <h6 className="text-xs font-bold uppercase tracking-widest text-main/60 mb-2">Visual Corpus</h6>
                        <h2 className="text-2xl font-bold text-main">
                            {imageCount > 0 ? imageCount : '0'} <span className="text-sm font-normal text-main/60">Images</span>
                        </h2>
                    </div>
                    <div className="w-12 h-12 border-2 border-main bg-alt flex items-center justify-center text-main shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
                        <Image className="w-6 h-6" />
                    </div>
                </div>

                {/* Text Corpus */}
                <div className="deep-panel p-6 flex items-center justify-between">
                    <div>
                        <h6 className="text-xs font-bold uppercase tracking-widest text-main/60 mb-2">Text Corpus</h6>
                        <h2 className="text-2xl font-bold text-main">
                            {textCount > 0 ? textCount : '0'} <span className="text-sm font-normal text-main/60">Documents</span>
                        </h2>
                    </div>
                    <div className="w-12 h-12 border-2 border-main bg-white flex items-center justify-center text-main shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
                        <FileText className="w-6 h-6" />
                    </div>
                </div>

                {/* Timeline Data (Discontinuity Detector) */}
                <div className="deep-panel p-6 flex items-center justify-between">
                    <div>
                        <h6 className="text-xs font-bold uppercase tracking-widest text-main/60 mb-2">Other Data</h6>
                        <h2 className="text-2xl font-bold text-main">
                            {otherCount > 0 ? otherCount : '0'} <span className="text-sm font-normal text-main/60">Records</span>
                        </h2>
                    </div>
                    <div className="w-12 h-12 border-2 border-main bg-white flex items-center justify-center text-main shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
                        <Activity className="w-6 h-6" />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default StatsRow;
