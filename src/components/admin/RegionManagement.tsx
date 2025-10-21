import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Region = Database['public']['Tables']['regions']['Row'];

interface FederalState {
  id: string;
  name: string;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface RegionWithState extends Region {
  federal_state_id: string | null;
}

export function RegionManagement() {
  const [federalStates, setFederalStates] = useState<FederalState[]>([]);
  const [regions, setRegions] = useState<RegionWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRegion, setEditingRegion] = useState<RegionWithState | null>(null);
  const [selectedFederalStateId, setSelectedFederalStateId] = useState<string>('');
  const [formData, setFormData] = useState({ name: '', description: '', federal_state_id: '' });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [draggedStateIndex, setDraggedStateIndex] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: statesData, error: statesError } = await supabase
        .from('federal_states')
        .select('*')
        .order('sort_order');

      if (statesError) throw statesError;
      setFederalStates(statesData || []);

      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('*')
        .order('sort_order');

      if (regionsError) throw regionsError;
      setRegions(regionsData || []);

      if (statesData && statesData.length > 0) {
        const allStateIds = new Set(statesData.map(s => s.id));
        setExpandedStates(allStateIds);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleState = (stateId: string) => {
    const newExpanded = new Set(expandedStates);
    if (newExpanded.has(stateId)) {
      newExpanded.delete(stateId);
    } else {
      newExpanded.add(stateId);
    }
    setExpandedStates(newExpanded);
  };

  const getRegionsForState = (stateId: string) => {
    return regions.filter(r => r.federal_state_id === stateId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRegion) {
        const { error } = await supabase
          .from('regions')
          .update({
            name: formData.name,
            description: formData.description,
            federal_state_id: formData.federal_state_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRegion.id);

        if (error) throw error;
      } else {
        const stateRegions = regions.filter(r => r.federal_state_id === formData.federal_state_id);
        const maxSortOrder = stateRegions.length > 0
          ? Math.max(...stateRegions.map(r => r.sort_order || 0))
          : 0;

        const { error } = await supabase
          .from('regions')
          .insert([{
            name: formData.name,
            description: formData.description,
            federal_state_id: formData.federal_state_id || null,
            sort_order: maxSortOrder + 1
          }]);

        if (error) throw error;
      }

      setFormData({ name: '', description: '', federal_state_id: '' });
      setShowForm(false);
      setEditingRegion(null);
      loadData();
    } catch (error) {
      console.error('Error saving region:', error);
    }
  };

  const handleEdit = (region: RegionWithState) => {
    setEditingRegion(region);
    setFormData({
      name: region.name,
      description: region.description || '',
      federal_state_id: region.federal_state_id || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diese Region wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('regions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting region:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRegion(null);
    setFormData({ name: '', description: '', federal_state_id: '' });
  };

  const handleDragStart = (index: number, stateId: string) => {
    setDraggedIndex(index);
    setSelectedFederalStateId(stateId);
  };

  const handleDragOver = (e: React.DragEvent, index: number, stateId: string) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index || selectedFederalStateId !== stateId) return;

    const stateRegions = getRegionsForState(stateId);
    const newStateRegions = [...stateRegions];
    const draggedRegion = newStateRegions[draggedIndex];

    newStateRegions.splice(draggedIndex, 1);
    newStateRegions.splice(index, 0, draggedRegion);

    const otherRegions = regions.filter(r => r.federal_state_id !== stateId);
    setRegions([...otherRegions, ...newStateRegions]);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null || !selectedFederalStateId) return;

    try {
      const stateRegions = getRegionsForState(selectedFederalStateId);
      const updates = stateRegions.map((region, index) => ({
        id: region.id,
        sort_order: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('regions')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      setDraggedIndex(null);
      setSelectedFederalStateId('');
      loadData();
    } catch (error) {
      console.error('Error updating sort order:', error);
      loadData();
    }
  };

  const handleStateDragStart = (index: number) => {
    setDraggedStateIndex(index);
  };

  const handleStateDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStateIndex === null || draggedStateIndex === index) return;

    const newStates = [...federalStates];
    const draggedState = newStates[draggedStateIndex];

    newStates.splice(draggedStateIndex, 1);
    newStates.splice(index, 0, draggedState);

    setFederalStates(newStates);
    setDraggedStateIndex(index);
  };

  const handleStateDragEnd = async () => {
    if (draggedStateIndex === null) return;

    try {
      const updates = federalStates.map((state, index) => ({
        id: state.id,
        sort_order: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('federal_states')
          .update({ sort_order: update.sort_order, updated_at: new Date().toISOString() })
          .eq('id', update.id);

        if (error) throw error;
      }

      setDraggedStateIndex(null);
      loadData();
    } catch (error) {
      console.error('Error updating federal state sort order:', error);
      loadData();
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bundesländer & Regionen verwalten</h2>
          <p className="text-sm text-gray-600 mt-1">
            Fügen Sie Regionen zu den Bundesländern hinzu. Ziehen Sie die Regionen, um die Reihenfolge zu ändern.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Region hinzufügen
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingRegion ? 'Region bearbeiten' : 'Neue Region'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bundesland *
              </label>
              <select
                value={formData.federal_state_id}
                onChange={(e) => setFormData({ ...formData, federal_state_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Bundesland wählen...</option>
                {federalStates.map(state => (
                  <option key={state.id} value={state.id}>{state.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {editingRegion ? 'Aktualisieren' : 'Erstellen'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {federalStates.map((state, stateIndex) => {
          const stateRegions = getRegionsForState(state.id);
          const isExpanded = expandedStates.has(state.id);

          return (
            <div
              key={state.id}
              draggable
              onDragStart={() => handleStateDragStart(stateIndex)}
              onDragOver={(e) => handleStateDragOver(e, stateIndex)}
              onDragEnd={handleStateDragEnd}
              className={`bg-white border border-slate-200 rounded-lg overflow-hidden transition-opacity ${
                draggedStateIndex === stateIndex ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center p-4 hover:bg-slate-50 transition-colors">
                <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0 mr-2 cursor-move" />
                <button
                  onClick={() => toggleState(state.id)}
                  className="flex items-center gap-3 flex-1"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-gray-900 text-lg">{state.name}</h3>
                    <p className="text-sm text-gray-500">{stateRegions.length} {stateRegions.length === 1 ? 'Region' : 'Regionen'}</p>
                  </div>
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-2">
                  {stateRegions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Keine Regionen in diesem Bundesland. Fügen Sie eine neue Region hinzu.
                    </div>
                  ) : (
                    stateRegions.map((region, index) => (
                      <div
                        key={region.id}
                        draggable
                        onDragStart={() => handleDragStart(index, state.id)}
                        onDragOver={(e) => handleDragOver(e, index, state.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-all cursor-move ${
                          draggedIndex === index && selectedFederalStateId === state.id ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{region.name}</h4>
                            {region.description && (
                              <p className="text-sm text-gray-600 mt-1">{region.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleEdit(region)}
                              className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                              title="Bearbeiten"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(region.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
