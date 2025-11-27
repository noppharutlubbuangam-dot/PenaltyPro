

import React, { useState, useEffect } from 'react';
import { Upload, ArrowLeft, CheckCircle, School, User, FileText, Search, Image as ImageIcon, CreditCard, AlertCircle, X, Printer, Loader2 } from 'lucide-react';
import { registerTeam, fileToBase64 } from '../services/sheetService';
import { RegistrationData, AppSettings, School as SchoolType } from '../types';

interface RegistrationFormProps {
  onBack: () => void;
  schools: SchoolType[];
  config: AppSettings;
  showNotification?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DOC_SIZE = 3 * 1024 * 1024;   // 3MB

// Utility to compress image
const compressImage = async (file: File): Promise<File> => {
    if (file.type === 'application/pdf') return file; // Skip PDF
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const scaleSize = MAX_WIDTH / img.width;
                const width = (scaleSize < 1) ? MAX_WIDTH : img.width;
                const height = (scaleSize < 1) ? img.height * scaleSize : img.height;

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        reject(new Error('Canvas is empty'));
                    }
                }, 'image/jpeg', 0.7); // 70% Quality
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onBack, schools, config, showNotification }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');

  // 1. School & Team Info
  const [schoolName, setSchoolName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('กาญจนบุรี');
  const [phone, setPhone] = useState('');
  
  // Dual Colors
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');

  const [teamLogo, setTeamLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // 2. Personnel Info
  const [directorName, setDirectorName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [coachName, setCoachName] = useState('');
  const [coachPhone, setCoachPhone] = useState('');

  // 3. Players
  const [players, setPlayers] = useState(Array(7).fill(null).map((_, i) => ({
    sequence: i + 1,
    name: '',
    birthDate: '',
    photoFile: null as File | null,
    photoPreview: null as string | null
  })));

  // 4. Documents
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);

  // PDF Generation Logic (Print Window)
  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Pop-up blocked. Please allow pop-ups to print.");
        return;
    }

    const playersHtml = players.map(p => `
        <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px; text-align: center;">${p.sequence}</td>
            <td style="padding: 8px;">${p.name || '-'}</td>
            <td style="padding: 8px; text-align: center;">${p.birthDate || '-'}</td>
            <td style="padding: 8px; text-align: center;">${p.photoPreview ? '<span style="color:green;">✔ แนบรูปแล้ว</span>' : '<span style="color:red;">✘ ไม่มีรูป</span>'}</td>
        </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>ใบสมัคร - ${schoolName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Kanit', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 5px 10px; margin-bottom: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
            .label { font-weight: bold; font-size: 14px; color: #666; }
            .value { font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #eee; padding: 8px; text-align: left; font-size: 14px; }
            td { padding: 8px; font-size: 14px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 20px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ใบสมัครเข้าร่วมการแข่งขัน</h1>
            <h2>${config.competitionName}</h2>
          </div>

          <div class="section">
            <div class="section-title">1. ข้อมูลทีม / โรงเรียน</div>
            <div class="grid">
               <div><span class="label">ชื่อทีม/โรงเรียน:</span> <span class="value">${schoolName}</span></div>
               <div><span class="label">สังกัด:</span> <span class="value">${district}, ${province}</span></div>
               <div><span class="label">เบอร์โทรศัพท์:</span> <span class="value">${phone}</span></div>
               <div><span class="label">สีประจำทีม:</span> <div style="display:inline-block; width:20px; height:20px; background:${primaryColor}; border:1px solid #ccc; vertical-align:middle;"></div> <div style="display:inline-block; width:20px; height:20px; background:${secondaryColor}; border:1px solid #ccc; vertical-align:middle;"></div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. คณะผู้ควบคุมทีม</div>
             <div class="grid">
               <div><span class="label">ผู้อำนวยการ:</span> <span class="value">${directorName}</span></div>
               <div></div>
               <div><span class="label">ผู้จัดการทีม:</span> <span class="value">${managerName}</span></div>
               <div><span class="label">เบอร์โทร:</span> <span class="value">${managerPhone}</span></div>
               <div><span class="label">ผู้ฝึกสอน:</span> <span class="value">${coachName}</span></div>
               <div><span class="label">เบอร์โทร:</span> <span class="value">${coachPhone}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">3. รายชื่อนักกีฬา</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px; text-align: center;">ลำดับ</th>
                        <th>ชื่อ - นามสกุล</th>
                        <th style="width: 120px; text-align: center;">วัน/เดือน/ปีเกิด</th>
                        <th style="width: 100px; text-align: center;">รูปถ่าย</th>
                    </tr>
                </thead>
                <tbody>
                    ${playersHtml}
                </tbody>
            </table>
          </div>
          
          <div class="footer">
             เอกสารนี้ถูกสร้างจากระบบ Penalty Pro Recorder | ลงทะเบียนเมื่อ: ${new Date().toLocaleDateString('th-TH')}
             <br/><br/>
             ลงชื่อ ....................................................... ผู้รับรองข้อมูล
          </div>

          <script>
             window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  useEffect(() => {
    if (teamLogo) {
        const url = URL.createObjectURL(teamLogo);
        setLogoPreview(url);
        return () => URL.revokeObjectURL(url);
    }
  }, [teamLogo]);

  useEffect(() => {
    if (slipFile) {
        const url = URL.createObjectURL(slipFile);
        setSlipPreview(url);
        return () => URL.revokeObjectURL(url);
    }
  }, [slipFile]);

  const notify = (title: string, msg: string, type: 'success' | 'error' | 'info') => {
      if (showNotification) showNotification(title, msg, type);
      else alert(`${title}: ${msg}`);
  };

  const validateFile = (file: File, type: 'image' | 'doc') => {
    const limit = type === 'image' ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
    if (file.size > limit) {
        notify("ไฟล์ใหญ่เกินไป", `ขนาดไฟล์ต้องไม่เกิน ${limit / 1024 / 1024}MB (ระบบจะพยายามบีบอัด)`, "info");
        // We will try to compress, so don't return false immediately for images
        if(type === 'doc') return false; 
    }
    return true;
  };

  const updatePlayer = (index: number, field: string, value: any) => {
    const newPlayers = [...players];
    if (field === 'photoFile' && value) {
        // Compress Image immediately upon selection
        compressImage(value).then(compressed => {
             const url = URL.createObjectURL(compressed);
             newPlayers[index] = { ...newPlayers[index], photoFile: compressed, photoPreview: url };
             setPlayers(newPlayers);
        }).catch(err => {
             console.error("Compression failed", err);
             // Fallback to original
             const url = URL.createObjectURL(value);
             newPlayers[index] = { ...newPlayers[index], photoFile: value, photoPreview: url };
             setPlayers(newPlayers);
        });
    } else {
        newPlayers[index] = { ...newPlayers[index], [field]: value };
    }
    setPlayers(newPlayers);
  };
  
  const updatePlayerDate = (index: number, value: string) => {
      // Auto-format DD/MM/YYYY
      let cleaned = value.replace(/[^0-9]/g, '');
      if (cleaned.length > 8) cleaned = cleaned.substring(0, 8);
      
      let formatted = cleaned;
      if (cleaned.length > 2) {
          formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
      }
      if (cleaned.length > 4) {
          formatted = formatted.substring(0, 5) + '/' + cleaned.substring(4);
      }
      
      updatePlayer(index, 'birthDate', formatted);
  };

  const handleLogoChange = async (file: File) => {
      try {
        const compressed = await compressImage(file);
        setTeamLogo(compressed);
      } catch (e) { setTeamLogo(file); }
  };

  const handleDocChange = (file: File) => {
      if (validateFile(file, 'doc')) {
          setDocumentFile(file);
      }
  };

  const handleSlipChange = async (file: File) => {
      try {
        const compressed = await compressImage(file);
        setSlipFile(compressed);
      } catch (e) { setSlipFile(file); }
  };

  const handleSchoolSelect = (school: SchoolType) => {
    setSchoolName(school.name);
    setDistrict(school.district);
    setProvince(school.province);
    setShowSuggestions(false);
  };

  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(schoolName.toLowerCase()) && schoolName.length > 0
  );

  // Helper to generate Thai-English Acronym
  const generateThaiAcronym = (name: string): string => {
      // If pure English/Numbers, perform standard acronym
      if (/^[A-Za-z0-9\s]+$/.test(name)) {
          const parts = name.split(/\s+/);
          if (parts.length === 1) return name.substring(0, 3).toUpperCase();
          return parts.slice(0, 3).map(p => p[0]).join('').toUpperCase();
      }

      // Thai Logic: Remove "โรงเรียน" prefix if present
      let cleanName = name.replace(/^โรงเรียน/, '').trim();
      
      // Heuristic: Map common first letters of words
      // Simple approach: Pick first char of first 3 significant segments
      // Using regex to split by spaces or zero-width breaks isn't perfect in JS for Thai without lib
      // So we fallback to mapping consonants.
      
      // NOTE: This is a mock logic. In real-world, use a proper transliteration lib or user input.
      // Here we simply return empty to let backend/user decide, OR generate random 3 chars if lazy.
      // Better UX: Ask user to input it in Admin Dashboard later, or generate a Placeholder "T01"
      
      return "T" + Math.floor(Math.random() * 100).toString().padStart(2, '0');
  };

  const handleSubmit = async () => {
    if (!documentFile || !slipFile) {
        notify("ข้อมูลไม่ครบ", "กรุณาแนบเอกสารและหลักฐานการโอนเงิน", "error");
        return;
    }
    if (!schoolName) {
        notify("ข้อมูลไม่ครบ", "กรุณาระบุชื่อโรงเรียน", "error");
        return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);
    setUploadStage("เตรียมข้อมูล...");

    try {
      setUploadStage("กำลังอัปโหลดโลโก้ทีม...");
      const logoBase64 = teamLogo ? await fileToBase64(teamLogo) : null;
      setUploadProgress(25);

      setUploadStage("กำลังอัปโหลดเอกสาร...");
      const docBase64 = await fileToBase64(documentFile);
      const slipBase64 = await fileToBase64(slipFile);
      setUploadProgress(50);

      setUploadStage("กำลังประมวลผลข้อมูลผู้เล่น...");
      const processedPlayers = await Promise.all(players.map(async (p) => ({
        sequence: p.sequence,
        name: p.name,
        birthDate: p.birthDate,
        photoFile: p.photoFile ? await fileToBase64(p.photoFile) : null
      })));
      setUploadProgress(75);

      const validPlayers = processedPlayers.filter(p => p.name.trim() !== '');
      
      // Combine Colors
      const combinedColors = JSON.stringify([primaryColor, secondaryColor]);
      
      // Generate ShortName (Basic Logic)
      const shortName = generateThaiAcronym(schoolName);

      const payload: RegistrationData = {
        schoolName,
        shortName,
        district,
        province,
        phone,
        directorName,
        managerName,
        managerPhone,
        coachName,
        coachPhone,
        color: combinedColors,
        logoFile: logoBase64,
        documentFile: docBase64,
        slipFile: slipBase64,
        players: validPlayers,
        registrationTime: new Date().toISOString() // Add Timestamp
      };

      setUploadStage("กำลังบันทึกลงฐานข้อมูล...");
      await registerTeam(payload);
      setUploadProgress(100);
      setUploadStage("เสร็จสิ้น!");
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      notify("ผิดพลาด", "เกิดข้อผิดพลาดในการส่งข้อมูล (โปรดลองใหม่)", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white rounded-2xl shadow-xl border border-green-100">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">ลงทะเบียนเรียบร้อย</h2>
        <p className="text-slate-500 mb-8 text-lg">ข้อมูลใบสมัครและเอกสารของคุณถูกส่งเข้าสู่ระบบแล้ว<br/>สถานะปัจจุบัน: <span className="text-yellow-600 font-bold">รอตรวจสอบ (Pending)</span></p>
        
        <div className="flex flex-col md:flex-row gap-4 w-full max-w-md">
            <button onClick={handleDownloadPDF} className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow font-bold text-lg transition flex items-center justify-center gap-2">
                <Printer className="w-5 h-5" /> พิมพ์ / ดาวน์โหลด PDF
            </button>
            <button onClick={onBack} className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 font-bold text-lg transition">
                กลับสู่หน้าหลัก
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 my-8 relative">
      
      {isSubmitting && (
          <div className="absolute inset-0 z-[60] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-md space-y-4">
                  <div className="flex justify-between text-slate-600 font-bold">
                      <span>{uploadStage}</span>
                      <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 transition-all duration-500 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="text-center text-sm text-slate-400">ระบบกำลังบีบอัดรูปภาพและอัปโหลด กรุณารอสักครู่...</p>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="bg-indigo-900 p-6 text-white flex items-center gap-4 sticky top-0 z-50 shadow-lg">
        <button onClick={onBack} className="hover:bg-white/10 p-2 rounded-full transition">
            <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
            <h2 className="font-bold text-2xl">ใบสมัครแข่งขันยิงจุดโทษ</h2>
            <p className="text-indigo-200 text-sm">{config.competitionName}</p>
        </div>
      </div>

      <div className="p-8">
        {/* Steps Indicator */}
        <div className="flex justify-center mb-10">
            <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <React.Fragment key={i}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step === i ? 'bg-indigo-600 text-white scale-110 ring-4 ring-indigo-100' : step > i ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {step > i ? <CheckCircle className="w-6 h-6" /> : i}
                        </div>
                        {i < 4 && <div className={`w-12 h-1 ${step > i ? 'bg-green-500' : 'bg-slate-100'}`}></div>}
                    </React.Fragment>
                ))}
            </div>
        </div>

        {/* Step 1: School Info */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <div className="flex items-center gap-2 text-xl font-bold text-slate-800 border-b pb-2">
                <School className="w-6 h-6 text-indigo-600" />
                <h3>1. ข้อมูลโรงเรียน (สังกัด)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2 relative">
                    <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อโรงเรียน</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={schoolName} 
                            onChange={e => { setSchoolName(e.target.value); setShowSuggestions(true); }} 
                            onFocus={() => setShowSuggestions(true)}
                            className="w-full p-3 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                            placeholder="ค้นหาโรงเรียนในสังกัด..." 
                        />
                        <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    </div>
                    {showSuggestions && filteredSchools.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                            {filteredSchools.map(s => (
                                <div 
                                    key={s.id} 
                                    className="p-3 hover:bg-indigo-50 cursor-pointer text-slate-700 border-b border-slate-50 last:border-0 flex justify-between"
                                    onClick={() => handleSchoolSelect(s)}
                                >
                                    <span>{s.name}</span>
                                    <span className="text-xs text-slate-400">{s.district}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">อำเภอ</label>
                    <input type="text" value={district} onChange={e => setDistrict(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">จังหวัด</label>
                    <input type="text" value={province} onChange={e => setProvince(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์โรงเรียน</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" placeholder="0xx-xxxxxxx" />
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                <h4 className="font-bold text-slate-700 mb-4">อัตลักษณ์ทีม (เลือก 2 สี)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">สีหลัก (Primary)</label>
                        <div className="flex items-center gap-3">
                            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0" />
                            <span className="text-sm text-slate-500 font-mono">{primaryColor}</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">สีรอง (Secondary)</label>
                        <div className="flex items-center gap-3">
                            <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0" />
                            <span className="text-sm text-slate-500 font-mono">{secondaryColor}</span>
                        </div>
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">ตราสโมสร/โรงเรียน <span className="text-xs text-slate-400">(ระบบจะย่อขนาดให้อัตโนมัติ)</span></label>
                        <div className="flex items-center gap-4">
                             {logoPreview && (
                                <div className="w-16 h-16 rounded-lg border bg-white p-1 relative group">
                                     <img src={logoPreview} className="w-full h-full object-contain" />
                                     <button 
                                        onClick={() => {setTeamLogo(null); setLogoPreview(null);}} 
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm"
                                     >
                                         <X className="w-3 h-3"/>
                                     </button>
                                </div>
                             )}
                             <label className="flex-1 flex items-center gap-3 p-3 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-white transition">
                                <Upload className="w-5 h-5 text-slate-400" />
                                <span className="text-sm text-slate-600 truncate">{teamLogo ? teamLogo.name : 'อัปโหลดไฟล์ภาพ (PNG/JPG)'}</span>
                                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleLogoChange(e.target.files[0])} className="hidden" />
                             </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        )}

        {/* Step 2: Personnel */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <div className="flex items-center gap-2 text-xl font-bold text-slate-800 border-b pb-2">
                <User className="w-6 h-6 text-indigo-600" />
                <h3>2. คณะผู้ควบคุมทีม</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ผู้อำนวยการโรงเรียน</label>
                    <input type="text" value={directorName} onChange={e => setDirectorName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" placeholder="ชื่อ-นามสกุล ผอ." />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ผู้ควบคุมทีม (ผู้จัดการ)</label>
                        <input type="text" value={managerName} onChange={e => setManagerName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" placeholder="ชื่อ-นามสกุล" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ (ผู้ควบคุม)</label>
                        <input type="tel" value={managerPhone} onChange={e => setManagerPhone(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ผู้ฝึกสอน (โค้ช)</label>
                        <input type="text" value={coachName} onChange={e => setCoachName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" placeholder="ชื่อ-นามสกุล" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ (โค้ช)</label>
                        <input type="tel" value={coachPhone} onChange={e => setCoachPhone(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" />
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Step 3: Players */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
             <div className="flex items-center gap-2 text-xl font-bold text-slate-800 border-b pb-2 justify-between">
                <div className="flex items-center gap-2">
                    <User className="w-6 h-6 text-indigo-600" />
                    <h3>3. รายชื่อนักกีฬา (7 คน)</h3>
                </div>
            </div>
            <p className="text-sm text-slate-500 bg-blue-50 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600" /> สามารถกรอกวันเกิดเป็น พ.ศ. หรือ ค.ศ. ก็ได้ (เช่น 15/04/2555) ระบบจะแปลงให้อัตโนมัติ
            </p>
            
            <div className="space-y-4">
                {players.map((player, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-center w-8 h-8 bg-slate-200 rounded-full font-bold text-slate-600 shrink-0">
                            {player.sequence}
                        </div>
                        <div className="flex-1 w-full">
                            <input 
                                type="text" 
                                placeholder="ชื่อ - นามสกุล" 
                                value={player.name}
                                onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded"
                            />
                        </div>
                        <div className="w-full md:w-40 relative">
                            <input 
                                type="text" 
                                placeholder="วว/ดด/ปปปป" 
                                value={player.birthDate}
                                onChange={(e) => updatePlayerDate(index, e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded text-center"
                                maxLength={10}
                            />
                            <div className="text-[10px] text-slate-400 text-center mt-1">เช่น 12/08/2555</div>
                        </div>
                         <div className="w-full md:w-auto">
                            <label className={`cursor-pointer border px-3 py-2 rounded flex items-center gap-2 text-sm whitespace-nowrap transition ${player.photoFile ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-600'}`}>
                                {player.photoPreview ? (
                                    <img src={player.photoPreview} className="w-5 h-5 rounded-full object-cover" />
                                ) : <ImageIcon className="w-4 h-4"/>}
                                {player.photoFile ? 'เปลี่ยนรูป' : 'รูปถ่าย'}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => updatePlayer(index, 'photoFile', e.target.files?.[0] || null)} />
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        )}

        {/* Step 4: Documents */}
        {step === 4 && (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
             <div className="flex items-center gap-2 text-xl font-bold text-slate-800 border-b pb-2">
                <FileText className="w-6 h-6 text-indigo-600" />
                <h3>4. เอกสารหลักฐาน</h3>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <CreditCard className="w-6 h-6 text-blue-600 mt-1 shrink-0" />
                <div>
                    <h4 className="font-bold text-blue-800">รายละเอียดการชำระค่าสมัคร</h4>
                    <p className="text-blue-700 text-sm">{config.bankName}</p>
                    <p className="text-xl font-mono font-bold text-blue-900 my-1">{config.bankAccount}</p>
                    <p className="text-blue-700 text-sm">ชื่อบัญชี: {config.accountName}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition ${documentFile ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50'}`}>
                    <FileText className={`w-12 h-12 mx-auto mb-3 ${documentFile ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <h4 className="font-bold text-slate-700">เอกสารใบสมัคร (PDF/Doc) <span className="text-xs text-red-500 block font-normal mt-1">*ขนาดไม่เกิน 3MB</span></h4>
                    <p className="text-sm text-slate-500 mb-4">อัปโหลดไฟล์ใบสมัครที่มีลายเซ็นครบถ้วน</p>
                    <input type="file" id="doc-upload" accept=".pdf,.doc,.docx" className="hidden" onChange={e => e.target.files?.[0] && handleDocChange(e.target.files[0])} />
                    <label htmlFor="doc-upload" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition">
                        {documentFile ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์'}
                    </label>
                    {documentFile && <p className="mt-2 text-sm font-bold text-indigo-700">{documentFile.name}</p>}
                </div>

                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition ${slipFile ? 'border-pink-400 bg-pink-50' : 'border-slate-300 bg-slate-50'}`}>
                    {slipPreview ? (
                        <div className="mb-4">
                            <img src={slipPreview} alt="Slip" className="h-48 mx-auto object-contain rounded shadow-sm" />
                        </div>
                    ) : (
                        <ImageIcon className={`w-12 h-12 mx-auto mb-3 text-slate-400`} />
                    )}
                    <h4 className="font-bold text-slate-700">หลักฐานการโอนเงิน (Slip) <span className="text-xs text-red-500 block font-normal mt-1">*ระบบจะย่อขนาดอัตโนมัติ</span></h4>
                    <p className="text-sm text-slate-500 mb-4">อัปโหลดรูปสลิปการโอนเงิน</p>
                    <input type="file" id="slip-upload" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleSlipChange(e.target.files[0])} />
                    <label htmlFor="slip-upload" className="inline-block bg-pink-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-pink-700 transition">
                        {slipFile ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดสลิป'}
                    </label>
                    {slipFile && <p className="mt-2 text-sm font-bold text-pink-700">{slipFile.name}</p>}
                </div>
            </div>
           </div>
        )}

        <div className="flex justify-between mt-10 pt-6 border-t border-slate-100">
            {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
                    ย้อนกลับ
                </button>
            ) : <div></div>}
            
            {step < 4 ? (
                <button onClick={() => setStep(step + 1)} className="px-8 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition flex items-center gap-2">
                    ถัดไป <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
            ) : (
                <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="px-8 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ยืนยันการสมัคร'}
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default RegistrationForm;
