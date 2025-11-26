import React, { useState } from 'react';
import { NewsItem } from '../types';
import { Calendar, Bell, X, FileText, Download } from 'lucide-react';

interface NewsFeedProps {
  news: NewsItem[];
  isLoading?: boolean;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ news, isLoading }) => {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-2 mb-4 px-2">
           <div className="w-5 h-5 bg-slate-200 rounded-full animate-pulse" />
           <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {[1, 2].map((i) => (
             <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-80 flex flex-col">
                <div className="h-48 bg-slate-200 animate-pulse" />
                <div className="p-5 flex-1 space-y-3">
                   <div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse" />
                   <div className="h-6 w-3/4 bg-slate-200 rounded animate-pulse" />
                   <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  }

  if (!news || news.length === 0) return null;

  // Sort by date descending
  const sortedNews = [...news].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <>
      <div className="w-full max-w-4xl mx-auto mb-8 animate-in slide-in-from-bottom-5">
        <div className="flex items-center gap-2 mb-4 px-2">
           <Bell className="w-5 h-5 text-orange-500" />
           <h3 className="font-bold text-slate-800 text-lg">ข่าวประชาสัมพันธ์ล่าสุด</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {sortedNews.map(item => (
               <div 
                  key={item.id} 
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition group cursor-pointer"
                  onClick={() => setSelectedNews(item)}
               >
                   {item.imageUrl && (
                       <div className="h-48 overflow-hidden bg-slate-100 relative">
                           <img 
                              src={item.imageUrl} 
                              alt={item.title} 
                              className="w-full h-full object-cover transition group-hover:scale-105 duration-500" 
                           />
                       </div>
                   )}
                   <div className="p-5">
                       <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                           <Calendar className="w-3 h-3" />
                           {new Date(item.timestamp).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                       </div>
                       <h4 className="font-bold text-slate-800 text-lg mb-2 line-clamp-2 group-hover:text-indigo-600 transition">{item.title}</h4>
                       <p className="text-slate-600 text-sm line-clamp-3 whitespace-pre-line">{item.content}</p>
                       {item.documentUrl && (
                           <div className="mt-3 flex items-center gap-1 text-xs text-indigo-600 font-medium">
                               <FileText className="w-3 h-3" /> มีเอกสารแนบ
                           </div>
                       )}
                   </div>
               </div>
           ))}
        </div>
      </div>

      {/* News Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 my-8">
                <div className="relative">
                    {selectedNews.imageUrl && (
                        <img src={selectedNews.imageUrl} className="w-full max-h-64 object-cover" />
                    )}
                    <button 
                        onClick={() => setSelectedNews(null)}
                        className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 md:p-8">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedNews.timestamp).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6 leading-tight">
                        {selectedNews.title}
                    </h2>
                    
                    <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-line mb-8">
                        {selectedNews.content}
                    </div>

                    {selectedNews.documentUrl && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between gap-4 hover:bg-indigo-100 transition">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 p-2 rounded-lg">
                                    <FileText className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-indigo-900 text-sm">เอกสารแนบ</p>
                                    <p className="text-xs text-indigo-600">คลิกเพื่อดาวน์โหลดหรือเปิดดู</p>
                                </div>
                            </div>
                            <a 
                                href={selectedNews.documentUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                download
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold text-sm shadow-sm"
                            >
                                <Download className="w-4 h-4" /> ดาวน์โหลด
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default NewsFeed;