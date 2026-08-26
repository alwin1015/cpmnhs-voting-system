import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Trash2,
  X,
  AlertTriangle,
  Sparkles,
  Shield,
  Layers,
  CheckCircle2
} from 'lucide-react';

export default function PositionsPage() {
  const { positions, addPosition, deletePosition, cleanupDuplicatePositions, user, isLoggedIn, activeSession } = useVoting();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [newMaxVotes, setNewMaxVotes] = useState('1');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const isAdmin = isLoggedIn && user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8 border-slate-100 shadow-lg bg-white rounded-2xl">
            <CardContent className="pt-6">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Access Denied</h2>
              <p className="text-sm text-gray-500 mb-6">
                Position management is restricted to administrators.
              </p>
              <Button
                onClick={() => window.location.href = '/'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 text-sm"
              >
                Return Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const handleAdd = async () => {
    if (!newPositionName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a position name.',
        variant: 'destructive',
      });
      return;
    }

    const maxVotes = parseInt(newMaxVotes) || 1;
    const nameTrimmed = newPositionName.trim();
    
    // Instant UI dismissal
    setNewPositionName('');
    setNewMaxVotes('1');
    setShowForm(false);
    setIsAdding(false);

    try {
      addPosition({
        name: nameTrimmed,
        maxVotes,
        order: positions.length + 1,
        strictGradeMapping: true,
      }).then(() => {
        toast({
          title: 'Position Added',
          description: `"${nameTrimmed}" was created successfully.`,
        });
      }).catch((error: any) => {
        toast({
          title: 'Failed to Add Position',
          description: error.message || 'Could not create position.',
          variant: 'destructive',
        });
      });
    } catch (error: any) {
      // Synchronous errors
    }
  };

  const handleDelete = (id: string) => {
    deletePosition(id);
    setDeleteConfirm(null);
    toast({
      title: 'Position Removed',
      description: 'The position has been deleted.',
    });
  };

  const handleCleanupDuplicates = async () => {
    setIsCleaning(true);
    try {
      const res = await cleanupDuplicatePositions();
      if (res.count > 0) {
        toast({
          title: 'Duplicates Removed',
          description: `Cleaned up ${res.count} duplicate position records and remapped candidates.`,
        });
      } else {
        toast({
          title: 'All Clean',
          description: 'No duplicate positions found in the database.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Cleanup Error',
        description: error.message || 'Failed to remove duplicate positions.',
        variant: 'destructive',
      });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <Header />

      <main className="flex-1 py-6 sm:py-8">
        <div className="container mx-auto px-4 max-w-4xl">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  Election Positions
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {positions.length} Active Positions
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">
                Configure ballot positions and maximum votes allowed per position for <span className="font-semibold text-blue-600">{activeSession?.name || 'Session 1'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanupDuplicates}
                disabled={isCleaning}
                className="h-9 gap-1.5 text-xs sm:text-sm border-amber-200 text-amber-800 hover:bg-amber-50"
              >
                <Sparkles className="h-4 w-4 text-amber-600" />
                {isCleaning ? 'Cleaning...' : 'Fix & Deduplicate'}
              </Button>

              <Button
                size="sm"
                onClick={() => setShowForm(true)}
                className="h-9 gap-1.5 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <Plus className="h-4 w-4" /> Add Position
              </Button>
            </div>
          </div>

          {/* Add Position Form */}
          {showForm && (
            <Card className="mb-6 border border-blue-200 shadow-sm bg-white rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-gray-900">Add New Position</h3>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Position Title
                    </Label>
                    <Input
                      placeholder="e.g. President, Auditor, Grade 10 Rep"
                      value={newPositionName}
                      onChange={(e) => setNewPositionName(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Max Votes Allowed
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={newMaxVotes}
                      onChange={(e) => setNewMaxVotes(e.target.value)}
                      placeholder="1"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(false)}
                    className="h-8 text-xs text-gray-500 hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    disabled={isAdding}
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isAdding ? 'Saving...' : 'Save Position'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Positions Table */}
          <Card className="border border-gray-200/80 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">
                        #
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Position Name
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-36">
                        Max Votes
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right w-24">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {positions.map((position, index) => (
                      <tr key={position.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-xs text-gray-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          {position.name}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 text-xs font-medium">
                          {position.maxVotes} {position.maxVotes > 1 ? 'votes' : 'vote'} max
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {deleteConfirm === position.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleDelete(position.id)}
                                className="px-2 py-0.5 text-xs text-white bg-red-600 rounded hover:bg-red-700 font-medium"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-0.5 text-xs text-gray-500 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(position.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete position"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {positions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-400 text-sm">
                          No positions defined yet. Click "Add Position" to create one.
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
