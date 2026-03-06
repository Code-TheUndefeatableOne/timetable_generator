import React, { useState } from 'react';
import { SyncConstraint, Section, Subject, GradeStructure, Day } from '../../types';
import { Card, Button, Input, Label } from '../UI';
import { Plus, Trash2, RefreshCcw } from 'lucide-react';
import { DAYS } from '../../utils/scheduler';

interface SyncViewProps {
  syncConstraints: SyncConstraint[];
  setSyncConstraints: React.Dispatch<React.SetStateAction<SyncConstraint[]>>;
  sections: Section[];
  subjects: Subject[];
  gradeStructures: GradeStructure[];
  searchQuery?: string;
}

export const SyncView: React.FC<SyncViewProps> = ({
  syncConstraints,
  setSyncConstraints,
  sections,
  subjects,
  gradeStructures,
  searchQuery = ''
}) => {
  const [selectedGradeId, setSelectedGradeId] = useState<string>(gradeStructures[0]?.id || '');
  const [newSync, setNewSync] = useState<Partial<SyncConstraint>>({
    sectionIds: [],
    day: 'Monday',
    periodIndex: 0,
    subjectId: ''
  });

  const filteredSyncConstraints = syncConstraints.filter(sync => {
    const subject = subjects.find(s => s.id === sync.subjectId);
    const syncSections = sections.filter(s => sync.sectionIds.includes(s.id));
    const query = searchQuery.toLowerCase();
    
    return (
      subject?.name.toLowerCase().includes(query) ||
      sync.day.toLowerCase().includes(query) ||
      syncSections.some(s => s.name.toLowerCase().includes(query))
    );
  });

  const selectedGrade = gradeStructures.find(g => g.id === selectedGradeId);
  const periodSlots = selectedGrade?.slots.filter(s => s.type === 'period') || [];

  const handleAddSync = () => {
    if (newSync.sectionIds && newSync.sectionIds.length > 1 && newSync.subjectId && newSync.day !== undefined && newSync.periodIndex !== undefined) {
      setSyncConstraints([
        ...syncConstraints,
        {
          id: Math.random().toString(36).substr(2, 9),
          sectionIds: newSync.sectionIds,
          day: newSync.day as Day,
          periodIndex: newSync.periodIndex,
          subjectId: newSync.subjectId
        }
      ]);
      setNewSync({ ...newSync, sectionIds: [], subjectId: '' });
    }
  };

  const handleRemoveSync = (id: string) => {
    setSyncConstraints(syncConstraints.filter(s => s.id !== id));
  };

  const toggleSection = (sectionId: string) => {
    const current = newSync.sectionIds || [];
    if (current.includes(sectionId)) {
      setNewSync({ ...newSync, sectionIds: current.filter(id => id !== sectionId) });
    } else {
      setNewSync({ ...newSync, sectionIds: [...current, sectionId] });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between sticky top-20 bg-[#FDFDFD]/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md z-30 py-4 border-b border-zinc-100 dark:border-zinc-800 -mx-10 px-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">Synchronization</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium italic">Ensure multiple sections have the same subject at the same time.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="sticky top-44">
            <Card title="Add Sync Constraint" icon={Plus}>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label>Select Subject</Label>
                  <select 
                    className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 outline-none transition-all dark:text-white"
                    value={newSync.subjectId}
                    onChange={(e) => setNewSync({ ...newSync, subjectId: e.target.value })}
                  >
                    <option value="" className="dark:bg-zinc-900">Select a subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id} className="dark:bg-zinc-900">{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Reference Grade (for slots)</Label>
                  <select 
                    className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 outline-none transition-all dark:text-white"
                    value={selectedGradeId}
                    onChange={(e) => setSelectedGradeId(e.target.value)}
                  >
                    {gradeStructures.map(g => (
                      <option key={g.id} value={g.id} className="dark:bg-zinc-900">{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Day</Label>
                    <select 
                      className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 outline-none transition-all dark:text-white"
                      value={newSync.day}
                      onChange={(e) => setNewSync({ ...newSync, day: e.target.value as Day })}
                    >
                      {DAYS.map(d => (
                        <option key={d} value={d} className="dark:bg-zinc-900">{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Period</Label>
                    <select 
                      className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 outline-none transition-all dark:text-white"
                      value={newSync.periodIndex}
                      onChange={(e) => setNewSync({ ...newSync, periodIndex: parseInt(e.target.value) })}
                    >
                      {periodSlots.map((slot, idx) => (
                        <option key={slot.id} value={idx} className="dark:bg-zinc-900">{slot.label} ({slot.startTime})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Select Sections (Min 2)</Label>
                  <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 space-y-1 custom-scrollbar">
                    {sections.map(section => (
                      <label key={section.id} className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={newSync.sectionIds?.includes(section.id)}
                          onChange={() => toggleSection(section.id)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-gold-500 focus:ring-gold-500 bg-transparent"
                        />
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">{section.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleAddSync}
                  disabled={!newSync.subjectId || (newSync.sectionIds?.length || 0) < 2}
                >
                  Add Constraint
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <Card title="Active Constraints" icon={RefreshCcw} className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Subject</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Time</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Sections</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                {filteredSyncConstraints.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 italic text-sm">
                      {searchQuery ? 'No matching constraints found.' : 'No synchronization constraints defined.'}
                    </td>
                  </tr>
                ) : (
                  filteredSyncConstraints.map(sync => {
                    const subject = subjects.find(s => s.id === sync.subjectId);
                    const syncSections = sections.filter(s => sync.sectionIds.includes(s.id));
                    return (
                      <tr key={sync.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject?.color }} />
                            <span className="font-black text-xs uppercase tracking-widest dark:text-zinc-300">{subject?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400">
                            {sync.day}, Period {sync.periodIndex + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {syncSections.map(s => (
                              <span key={s.id} className="text-[10px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleRemoveSync(sync.id)}
                            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
