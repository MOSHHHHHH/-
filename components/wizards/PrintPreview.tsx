
import React from 'react';
import { TimetableData } from '../../types';

interface PrintPreviewProps {
  data: TimetableData[];
  groupName: string;
}

const PrintPreview: React.FC<PrintPreviewProps> = ({ data, groupName }) => {
  if (data.length === 0) return null;

  return (
    <div id="print-area" className="hidden">
      {data.map(dayData => (
        <div key={dayData.day} className="p-4" style={{ pageBreakAfter: 'always' }}>
          <h2 className="text-2xl font-bold mb-4 text-center">{dayData.nickname} - {groupName}</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 border border-slate-300 text-right font-semibold">קו</th>
                <th className="p-2 border border-slate-300 text-right font-semibold">מסלול</th>
                <th className="p-2 border border-slate-300 text-right font-semibold">שעה</th>
              </tr>
            </thead>
            <tbody>
              {dayData.rides.map(ride => (
                <tr key={ride.id}>
                  <td className="p-2 border border-slate-300 w-16">{ride.gtfs_route__route_short_name}</td>
                  <td className="p-2 border border-slate-300 w-2/3">{ride.gtfs_route__route_long_name}</td>
                  <td className="p-2 border border-slate-300 w-24">{new Date(ride.arrival_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-center mt-8 text-xs text-slate-500">
            נוצר באמצעות לו"ז מייקר
          </p>
        </div>
      ))}
    </div>
  );
};

export default PrintPreview;
