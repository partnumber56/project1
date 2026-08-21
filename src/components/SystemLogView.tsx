import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Activity, Trash2, Edit3 } from 'lucide-react';

interface SystemLog {
  id: string;
  adminEmail: string;
  actionType: string;
  description: string;
  timestamp: any;
  details: any;
}

export default function SystemLogView() {
  const [logs, setLogs] = useState<SystemLog[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'systemLogs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SystemLog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'systemLogs');
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-50/50 p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Системний Журнал</h1>
          <p className="text-slate-500 font-medium">Історія дій адміністраторів</p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-sm">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  {log.actionType.includes('DELETE') ? (
                    <Trash2 className="w-5 h-5 text-rose-500" />
                  ) : (
                    <Edit3 className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black text-slate-900">{log.adminEmail}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {log.actionType}
                    </span>
                    <span className="text-xs font-mono text-slate-400 ml-auto">
                      {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('uk-UA') : '...'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{log.description}</p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-medium italic">
                Журнал порожній
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
