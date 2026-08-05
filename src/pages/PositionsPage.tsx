import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PositionsPage() {
  const { positions, addPosition, deletePosition, user, isLoggedIn } = useVoting();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [newMaxVotes, setNewMaxVotes] = useState('1');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isAdmin = isLoggedIn && user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p>Access Denied</p>
        </main>
        <Footer />
      </div>
    );
  }

  const handleAdd = () => {
    if (!newPositionName.trim()) {
      alert('Please enter a position name');
      return;
    }
    const maxVotes = parseInt(newMaxVotes) || 1;
    addPosition({
      name: newPositionName.trim(),
      maxVotes,
      order: positions.length + 1,
      strictGradeMapping: true, // Always enable grade map logic
    });
    setNewPositionName('');
    setNewMaxVotes('1');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    deletePosition(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-8 animate-slide-up">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Positions</h1>
              <p className="text-gray-500">Manage election positions</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowForm(true)}
                className="gap-2 text-white"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                <Plus className="h-4 w-4" /> Add Position
              </Button>
            </div>
          </div>

          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-800">Careful with Modifications</h4>
              <p className="text-xs text-yellow-700 mt-1">
                Adding or removing positions while an election is active or candidates are registered may cause data inconsistency. 
                It is recommended to only configure positions before registering candidates.
              </p>
            </div>
          </div>

          {showForm && (
            <Card className="mb-6 border border-blue-100 shadow-sm animate-fade-in" style={{ background: '#f8faff' }}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Add New Position</h3>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="mb-1 block">Position Name</Label>
                    <Input
                      value={newPositionName}
                      onChange={(e) => setNewPositionName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">Max Votes Allowed</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newMaxVotes}
                      onChange={(e) => setNewMaxVotes(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAdd} className="bg-blue-600 text-white hover:bg-blue-700">
                    Save Position
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border border-gray-100 shadow-sm" style={{ background: 'rgba(255,255,255,0.9)' }}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Order</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Position Name</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Max Votes</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {positions.map((position, index) => (
                      <tr key={position.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4 text-sm text-gray-500 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-4 px-4 font-medium text-gray-900">
                          {position.name}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {position.maxVotes}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {deleteConfirm === position.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(position.id)}
                                  className="px-2 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded hover:bg-gray-200"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(position.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {positions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                          No positions defined
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
