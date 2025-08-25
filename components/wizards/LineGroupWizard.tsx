
import React, { useState, useEffect } from 'react';
import { LineGroup, SelectedLine, GtfsRoute, GtfsRideStop, SelectedStop } from '../../types';
import { fetchRoutesForLine, fetchStopsForRoute } from '../../services/apiService';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface LineGroupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: LineGroup) => void;
  initialGroup: LineGroup | null;
}

const LineGroupWizard: React.FC<LineGroupWizardProps> = ({ isOpen, onClose, onSave, initialGroup }) => {
  const [step, setStep] = useState(1);
  const [group, setGroup] = useState<LineGroup>(initialGroup || { id: Date.now().toString(), name: '', lines: [] });
  const [newLineNumber, setNewLineNumber] = useState('');
  const [foundRoutes, setFoundRoutes] = useState<GtfsRoute[]>([]);
  const [foundStops, setFoundStops] = useState<Record<string, GtfsRideStop[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setGroup(initialGroup || { id: Date.now().toString(), name: '', lines: [] });
      setStep(1);
      setNewLineNumber('');
      setFoundRoutes([]);
      setFoundStops({});
      setError('');
    }
  }, [isOpen, initialGroup]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleAddLine = async () => {
    if (!newLineNumber.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const routes = await fetchRoutesForLine(newLineNumber);
      if (routes.length === 0) {
        setError(`לא נמצאו מסלולים לקו ${newLineNumber}`);
      } else {
        setFoundRoutes(routes);
      }
    } catch (e) {
      setError('שגיאה באחזור מסלולים. נסו שוב מאוחר יותר.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectRoute = (route: GtfsRoute) => {
      const lineId = `${route.route_mkt}-${route.route_direction}-${route.route_alternative}`;
      if (group.lines.some(l => l.id === lineId)) return;

      const newLine: SelectedLine = {
          id: lineId,
          short_name: route.route_short_name,
          long_name: route.route_long_name,
          mkt: route.route_mkt,
          direction: route.route_direction,
          alternative: route.route_alternative,
          agency: route.agency_name,
          selected_stop: null,
      };
      setGroup(g => ({ ...g, lines: [...g.lines, newLine] }));
      setNewLineNumber('');
      setFoundRoutes([]);
  };

  const handleFetchStops = async (line: SelectedLine) => {
    if (foundStops[line.id]) return;
    setIsLoading(true);
    setError('');
    try {
      const stops = await fetchStopsForRoute(line);
      const uniqueStops = Array.from(new Map(stops.map(stop => [stop.gtfs_stop__code, stop])).values());
      setFoundStops(prev => ({ ...prev, [line.id]: uniqueStops }));
    } catch(e) {
      setError(`שגיאה באחזור תחנות לקו ${line.short_name}.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
      if (step === 3) {
          group.lines.forEach(line => {
              if (!foundStops[line.id]) {
                  handleFetchStops(line);
              }
          });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, group.lines]);

  const handleSelectStop = (lineId: string, stop: GtfsRideStop) => {
    const newStop: SelectedStop = { code: stop.gtfs_stop__code, name: stop.gtfs_stop__name, city: stop.gtfs_stop__city };
    setGroup(g => ({
        ...g,
        lines: g.lines.map(l => l.id === lineId ? { ...l, selected_stop: newStop } : l)
    }));
  };

  const handleSave = () => {
    if (!group.name) {
        setError("חובה לתת שם לקבוצה.");
        return;
    }
    if (group.lines.some(l => !l.selected_stop)) {
        setError("חובה לבחור תחנה לכל קו.");
        return;
    }
    onSave(group);
    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div>
          <label htmlFor="groupName" className="block text-sm font-medium text-slate-700 mb-1">שם קבוצת הקווים</label>
          <input
            id="groupName"
            type="text"
            value={group.name}
            onChange={(e) => setGroup({ ...group, name: e.target.value })}
            placeholder="לדוגמה: קווים מהבית לירושלים"
            className="w-full p-2 border border-slate-300 rounded-md"
          />
        </div>
      );
      case 2: return (
        <div>
            <h3 className="font-bold mb-2">קווים שמורים בקבוצה</h3>
            {group.lines.length === 0 ? <p className="text-sm text-slate-500 mb-4">אין עדיין קווים בקבוצה.</p> : (
                <ul className="space-y-2 mb-4">
                    {group.lines.map(line => (
                        <li key={line.id} className="bg-slate-100 p-2 rounded-md flex justify-between items-center text-sm">
                            <span><b>{line.short_name}</b>: {line.long_name}</span>
                            <button onClick={() => setGroup(g => ({ ...g, lines: g.lines.filter(l => l.id !== line.id)}))} className="text-red-500 hover:text-red-700">&times;</button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex gap-2 items-center mb-4">
                <input
                    type="text"
                    value={newLineNumber}
                    onChange={(e) => setNewLineNumber(e.target.value)}
                    placeholder="הוסף מספר קו"
                    className="flex-grow p-2 border border-slate-300 rounded-md"
                />
                <Button onClick={handleAddLine} disabled={isLoading}>{isLoading ? 'מחפש...' : 'הוסף'}</Button>
            </div>
            {foundRoutes.length > 0 && (
                <div className="mt-4 max-h-60 overflow-y-auto border p-2 rounded-md">
                    <h4 className="font-semibold mb-2">בחר מסלול עבור קו {newLineNumber}:</h4>
                    <ul className="space-y-1">
                        {foundRoutes.map(route => (
                            <li key={route.id}>
                                <button onClick={() => handleSelectRoute(route)} className="w-full text-right p-2 rounded hover:bg-sky-100 text-sm">
                                    {route.route_long_name} ({route.agency_name})
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
      );
      case 3: return (
          <div className="space-y-4">
              {group.lines.map(line => (
                  <div key={line.id} className="bg-slate-50 p-3 rounded-lg border">
                      <h4 className="font-bold">{line.short_name}: {line.long_name}</h4>
                      {line.selected_stop && <p className="text-sm text-green-700 my-1">תחנה נבחרת: {line.selected_stop.name}, {line.selected_stop.city} ({line.selected_stop.code})</p>}
                      <select
                        value={line.selected_stop?.code || ''}
                        onChange={(e) => handleSelectStop(line.id, foundStops[line.id].find(s => s.gtfs_stop__code === parseInt(e.target.value))!)}
                        className="w-full p-2 mt-2 border border-slate-300 rounded-md"
                      >
                          <option value="" disabled>בחר תחנה...</option>
                          {foundStops[line.id]?.map(stop => (
                              <option key={stop.id} value={stop.gtfs_stop__code}>{stop.gtfs_stop__name}, {stop.gtfs_stop__city}</option>
                          ))}
                      </select>
                      {isLoading && !foundStops[line.id] && <p className="text-sm text-slate-500 mt-1">טוען תחנות...</p>}
                  </div>
              ))}
          </div>
      );
      default: return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialGroup ? 'עריכת קבוצת קווים' : 'הוספת קבוצת קווים'}>
      <div>
        <div className="mb-4">
            {renderStep()}
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            <span className="text-sm text-slate-500">שלב {step} מתוך 3</span>
          </div>
          <div className="flex gap-2">
            {step > 1 && <Button variant="secondary" onClick={handleBack}>הקודם</Button>}
            {step < 3 && <Button onClick={handleNext} disabled={step === 1 && !group.name}>הבא</Button>}
            {step === 3 && <Button onClick={handleSave}>שמור קבוצה</Button>}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LineGroupWizard;
