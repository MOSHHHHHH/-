
import React, { useState, useCallback } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { LineGroup } from './types';
import LineGroupWizard from './components/wizards/LineGroupWizard';
import TimetableWizard from './components/wizards/TimetableWizard';
import Button from './components/ui/Button';
import Modal from './components/ui/Modal';

const App: React.FC = () => {
  const [lineGroups, setLineGroups] = useLocalStorage<LineGroup[]>('timetableMakerGroups', []);
  const [isGroupWizardOpen, setGroupWizardOpen] = useState(false);
  const [isTimetableWizardOpen, setTimetableWizardOpen] = useState(false);
  const [isHelpModalOpen, setHelpModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LineGroup | null>(null);
  const [groupForTimetable, setGroupForTimetable] = useState<LineGroup | null>(null);

  const handleSaveGroup = useCallback((group: LineGroup) => {
    setLineGroups(prev => {
      const existingIndex = prev.findIndex(g => g.id === group.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = group;
        return updated;
      }
      return [...prev, group];
    });
  }, [setLineGroups]);

  const handleDeleteGroup = (groupId: string) => {
    if (window.confirm("האם למחוק את קבוצת הקווים?")) {
      setLineGroups(prev => prev.filter(g => g.id !== groupId));
    }
  };

  const openAddGroupWizard = () => {
    setEditingGroup(null);
    setGroupWizardOpen(true);
  };

  const openEditGroupWizard = (group: LineGroup) => {
    setEditingGroup(group);
    setGroupWizardOpen(true);
  };

  const openTimetableWizard = (group: LineGroup) => {
    setGroupForTimetable(group);
    setTimetableWizardOpen(true);
  };

  const handleEditFromTimetableWizard = useCallback((group: LineGroup) => {
    setTimetableWizardOpen(false);
    setTimeout(() => openEditGroupWizard(group), 300);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-sky-700">לו"ז מייקר</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setHelpModalOpen(true)}>עזרה</Button>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSfMFmC7esFcy0zpMIzT0kk-CluXSRKBRBIVHNPxKRlUW_YZUA/viewform?usp=header" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">משוב</Button>
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800">קבוצות הקווים שלי</h2>
          <Button onClick={openAddGroupWizard}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            הוסף קבוצת קווים
          </Button>
        </div>

        {lineGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lineGroups.map(group => (
              <div key={group.id} className="bg-white rounded-lg shadow-lg p-5 flex flex-col">
                <h3 className="text-lg font-bold mb-2">{group.name}</h3>
                <ul className="text-sm text-slate-600 space-y-1 mb-4 flex-grow">
                  {group.lines.map(line => (
                    <li key={line.id}>קו <b>{line.short_name}</b> לתחנת <b>{line.selected_stop?.name}</b></li>
                  ))}
                </ul>
                <div className="flex gap-2 justify-end pt-4 border-t border-slate-200">
                  <Button variant="danger" onClick={() => handleDeleteGroup(group.id)}>מחק</Button>
                  <Button variant="secondary" onClick={() => openEditGroupWizard(group)}>ערוך</Button>
                  <Button onClick={() => openTimetableWizard(group)}>צור לו"ז</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <h3 className="text-lg text-slate-700">עדיין לא יצרת קבוצות קווים.</h3>
            <p className="text-slate-500 mb-4">לחץ על "הוסף קבוצת קווים" כדי להתחיל.</p>
          </div>
        )}
      </main>
      
      <footer className="text-center py-4 text-sm text-slate-500">
        נוצר באהבה על ידי קהילת הסדנא לידע ציבורי
      </footer>

      <LineGroupWizard 
        isOpen={isGroupWizardOpen}
        onClose={() => setGroupWizardOpen(false)}
        onSave={handleSaveGroup}
        initialGroup={editingGroup}
      />

      <TimetableWizard 
        isOpen={isTimetableWizardOpen}
        onClose={() => setTimetableWizardOpen(false)}
        group={groupForTimetable}
        onEdit={handleEditFromTimetableWizard}
      />
      
      <Modal isOpen={isHelpModalOpen} onClose={() => setHelpModalOpen(false)} title="עזרה">
        <div className="space-y-4 text-slate-700">
          <p>ברוכים הבאים ל<strong>לו"ז מייקר</strong>! הכלי ליצירת לוחות זמנים מותאמים אישית לתחבורה ציבורית.</p>
          <div>
            <h4 className="font-bold">איך מתחילים?</h4>
            <ol className="list-decimal list-inside space-y-1 mt-1">
              <li><strong>הוסף קבוצת קווים:</strong> לחץ על הכפתור המתאים במסך הראשי. קבוצה יכולה לייצג נסיעה קבועה, כמו "מהבית לעבודה".</li>
              <li><strong>בחר קווים:</strong> באשף שנפתח, תן שם לקבוצה, ולאחר מכן הוסף מספרי קווים. לכל קו, בחר את המסלול המדויק (כיוון נסיעה) שבו אתה מעוניין.</li>
              <li><strong>בחר תחנות:</strong> לכל קו ומסלול שבחרת, בחר את תחנת העלייה שלך מתוך הרשימה.</li>
              <li><strong>צור לו"ז:</strong> לאחר שמירת הקבוצה, היא תופיע במסך הראשי. לחץ על "צור לו"ז" כדי להתחיל.</li>
              <li><strong>הפקת הלו"ז:</strong> בחר את הימים הרצויים מהשבוע הקרוב. המערכת תאסוף את כל זמני ההגעה של הקווים שבחרת לתחנות שבחרת בימים אלו.</li>
              <li><strong>הורדה והדפסה:</strong> בסיום, תוכל להוריד את הנתונים כקובץ CSV (מתאים לאקסל) או להדפיס לוח זמנים מסודר לכל יום בנפרד או לכל הימים יחד.</li>
            </ol>
          </div>
          <p>המידע מבוסס על נתונים פתוחים של משרד התחבורה. ייתכנו שינויים ואי דיוקים.</p>
        </div>
      </Modal>
    </div>
  );
};

export default App;
