
import React, { useState, useEffect } from 'react';
import { LineGroup, TimetableData, GtfsRideStop } from '../../types';
import { fetchTimetable } from '../../services/apiService';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import PrintPreview from './PrintPreview';

interface TimetableWizardProps {
  isOpen: boolean;
  onClose: () => void;
  group: LineGroup | null;
  onEdit: (group: LineGroup) => void;
}

const getNextSevenDays = (): string[] => {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        days.push(date.toISOString().split('T')[0]);
    }
    return days;
};

const TimetableWizard: React.FC<TimetableWizardProps> = ({ isOpen, onClose, group, onEdit }) => {
  const [step, setStep] = useState(1);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [dayNicknames, setDayNicknames] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<TimetableData[]>([]);
  const [error, setError] = useState('');
  
  const availableDays = getNextSevenDays();

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedDays([]);
      setDayNicknames({});
      setProgress(0);
      setIsLoading(false);
      setGeneratedData([]);
      setError('');
    }
  }, [isOpen]);
  
  if (!group) return null;

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => {
        if (prev.includes(day)) {
            return prev.filter(d => d !== day);
        }
        if (prev.length < 5) {
            return [...prev, day];
        }
        return prev;
    });
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setProgress(0);
    setError('');
    const totalRequests = selectedDays.length * group.lines.length;
    let completedRequests = 0;
    
    const allRides: GtfsRideStop[] = [];

    for (const day of selectedDays) {
        for (const line of group.lines) {
            if (line.selected_stop) {
                try {
                    const rides = await fetchTimetable(line, line.selected_stop.code, day);
                    allRides.push(...rides);
                } catch (e) {
                    console.error(e);
                    setError(prev => prev + `\nשגיאה בטעינת מידע עבור קו ${line.short_name} בתאריך ${day}.`);
                }
            }
            completedRequests++;
            setProgress(Math.round((completedRequests / totalRequests) * 100));
        }
    }
    
    const processedData: TimetableData[] = selectedDays.map(day => {
        const ridesForDay = allRides
            .filter(ride => {
                const rideDate = new Date(ride.arrival_time).toISOString().split('T')[0];
                const dayBefore = new Date(day);
                dayBefore.setDate(dayBefore.getDate() - 1);
                const dayBeforeStr = dayBefore.toISOString().split('T')[0];

                const arrivalHour = new Date(ride.arrival_time).getUTCHours() + 2; // Assuming IL time
                
                if (arrivalHour < 3) return rideDate === day; // After midnight, part of previous service day
                return rideDate === day;
            })
            .sort((a, b) => new Date(a.arrival_time).getTime() - new Date(b.arrival_time).getTime());

        return {
            day: day,
            nickname: dayNicknames[day] || new Date(day).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit'}),
            rides: ridesForDay,
        };
    });

    setGeneratedData(processedData);
    setIsLoading(false);
    setStep(5); // Results step
  };
  
  const handleDownloadCSV = (data: TimetableData) => {
    const headers = ["שם קו קצר", "שם קו ארוך", "שעת יציאה"];
    const rows = data.rides.map(ride => [
        ride.gtfs_route__route_short_name,
        `"${ride.gtfs_route__route_long_name.replace(/"/g, '""')}"`,
        new Date(ride.arrival_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `${data.nickname},${group.name}.csv`;
    link.click();
  };

  const handlePrint = (data?: TimetableData[]) => {
      const printData = data || generatedData;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          const tableHtml = printData.map(dayData => `
              <div style="page-break-after: always;">
                  <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; text-align: center;">${dayData.nickname} - ${group.name}</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                      <thead>
                          <tr style="background-color: #f1f5f9;">
                              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">קו</th>
                              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">מסלול</th>
                              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">שעה</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${dayData.rides.map(ride => `
                              <tr>
                                  <td style="padding: 8px; border: 1px solid #cbd5e1;">${ride.gtfs_route__route_short_name}</td>
                                  <td style="padding: 8px; border: 1px solid #cbd5e1;">${ride.gtfs_route__route_long_name}</td>
                                  <td style="padding: 8px; border: 1px solid #cbd5e1;">${new Date(ride.arrival_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
                  <p style="text-align: center; margin-top: 2rem; font-size: 0.8rem;">נוצר באמצעות לו"ז מייקר</p>
              </div>
          `).join('');

          printWindow.document.write(`
              <html>
                  <head>
                      <title>הדפסת לוח זמנים</title>
                      <style>body { font-family: Heebo, sans-serif; direction: rtl; }</style>
                  </head>
                  <body>${tableHtml}</body>
              </html>
          `);
          printWindow.document.close();
          printWindow.print();
      }
  };


  const renderStep = () => {
    switch (step) {
      case 1: // Review
        return (
          <div>
            <h3 className="font-bold mb-2">קווים ותחנות בקבוצה:</h3>
            <ul className="space-y-2">
              {group.lines.map(line => (
                <li key={line.id} className="bg-slate-100 p-2 rounded-md text-sm">
                  <p><b>קו {line.short_name}</b>: {line.long_name}</p>
                  <p className="text-slate-600"><b>תחנה</b>: {line.selected_stop?.name}, {line.selected_stop?.city}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-center">
                <Button variant="secondary" onClick={() => onEdit(group)}>ערוך קווים ותחנות</Button>
            </div>
          </div>
        );
      case 2: // Select Days
        return (
            <div>
                <h3 className="font-bold mb-2">בחרו עד 5 ימים מהשבוע הקרוב:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {availableDays.map(day => (
                        <button 
                            key={day} 
                            onClick={() => handleDayToggle(day)}
                            className={`p-3 rounded-md text-center border-2 transition-colors ${selectedDays.includes(day) ? 'bg-sky-600 text-white border-sky-700' : 'bg-white hover:bg-sky-50 border-slate-300'}`}
                        >
                            <p className="font-semibold">{new Date(day).toLocaleDateString('he-IL', { weekday: 'long' })}</p>
                            <p className="text-sm">{new Date(day).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}</p>
                        </button>
                    ))}
                </div>
            </div>
        );
      case 3: // Nicknames
        return (
            <div>
                <h3 className="font-bold mb-2">תנו כינוי לכל יום (אופציונלי):</h3>
                <div className="space-y-2">
                    {selectedDays.map(day => (
                        <div key={day} className="flex items-center gap-2">
                            <label className="w-28" htmlFor={`nickname-${day}`}>
                                {new Date(day).toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit'})}
                            </label>
                            <input
                                id={`nickname-${day}`}
                                type="text"
                                placeholder={new Date(day).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                                value={dayNicknames[day] || ''}
                                onChange={e => setDayNicknames(prev => ({ ...prev, [day]: e.target.value }))}
                                className="flex-grow p-2 border border-slate-300 rounded-md"
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
      case 4: // Loading
        return (
            <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-2">אוסף נתונים... אנא המתן.</h3>
                <div className="w-full bg-slate-200 rounded-full h-4">
                    <div className="bg-sky-600 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="mt-2 text-slate-600">{progress}%</p>
                {error && <pre className="text-red-600 text-xs text-left whitespace-pre-wrap mt-4">{error}</pre>}
            </div>
        );
       case 5: // Results
        return (
          <div id="print-area-wrapper">
            <h3 className="text-xl font-bold mb-4 text-center text-green-700">הנתונים נאספו בהצלחה!</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedData.map(data => (
                <div key={data.day} className="bg-slate-100 p-4 rounded-lg text-center">
                  <h4 className="font-bold text-lg">{data.nickname}</h4>
                  <p className="text-sm text-slate-600 mb-3">{data.rides.length} נסיעות נמצאו</p>
                  <div className="flex justify-center gap-2">
                    <Button variant="secondary" onClick={() => handleDownloadCSV(data)}>הורד CSV</Button>
                    <Button variant="secondary" onClick={() => handlePrint([data])}>הדפס</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t text-center">
              <h4 className="font-bold mb-2">כל הימים</h4>
              <Button onClick={() => handlePrint()}>הדפס את כל הימים</Button>
            </div>
            <PrintPreview data={generatedData} groupName={group.name} />
          </div>
        );
      default: return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`יצירת לו"ז עבור "${group.name}"`}>
      <div>
        <div className="mb-4 min-h-[200px]">
          {renderStep()}
        </div>
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {step < 4 && <span className="text-sm text-slate-500">שלב {step} מתוך 3</span>}
          </div>
          <div className="flex gap-2">
            {step > 1 && step < 4 && <Button variant="secondary" onClick={() => setStep(s => s - 1)}>הקודם</Button>}
            {step < 3 && <Button onClick={() => setStep(s => s + 1)} disabled={(step===2 && selectedDays.length === 0)}>הבא</Button>}
            {step === 3 && <Button onClick={() => { setStep(4); handleGenerate(); }}>צור לו"ז</Button>}
            {step === 5 && <Button onClick={onClose}>סיימתי</Button>}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TimetableWizard;
