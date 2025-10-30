import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type FederalState = Database['public']['Tables']['regions']['Row'];

interface District {
  id: string;
  name: string;
  description: string | null;
  federal_state_id: string;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export function RegionManagement() {
  const [federalStates, setFederalStates] = useState<FederalState[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFederalStateForm, setShowFederalStateForm] = useState(false);
  const [showDistrictForm, setShowDistrictForm] = useState(false);
  const [editingFederalState, setEditingFederalState] = useState<FederalState | null>(null);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [federalStateFormData, setFederalStateFormData] = useState({ name: '', description: '' });
  const [districtFormData, setDistrictFormData] = useState({ name: '', description: '', federal_state_id: '' });
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [draggedStateIndex, setDraggedStateIndex] = useState<number | null>(null);
  const [draggedDistrictIndex, setDraggedDistrictIndex] = useState<number | null>(null);
  const [draggedDistrictStateId, setDraggedDistrictStateId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: statesData, error: statesError } = await supabase
        .from('regions')
        .select('*')
        .order('sort_order', { nullsFirst: false });

      if (statesError) throw statesError;
      setFederalStates(statesData || []);

      const { data: districtsData, error: districtsError } = await supabase
        .from('districts')
        .select('*')
        .order('sort_order');

      if (districtsError) throw districtsError;
      setDistricts(districtsData || []);

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

  const getDistrictsForState = (stateId: string) => {
    return districts.filter(d => d.federal_state_id === stateId);
  };

  const handleFederalStateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFederalState) {
        const { error } = await supabase
          .from('regions')
          .update({
            name: federalStateFormData.name,
            description: federalStateFormData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFederalState.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('regions')
          .insert([{
            name: federalStateFormData.name,
            description: federalStateFormData.description
          }]);

        if (error) throw error;
      }

      setFederalStateFormData({ name: '', description: '' });
      setShowFederalStateForm(false);
      setEditingFederalState(null);
      loadData();
    } catch (error) {
      console.error('Error saving federal state:', error);
    }
  };

  const handleDistrictSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDistrict) {
        const { error } = await supabase
          .from('districts')
          .update({
            name: districtFormData.name,
            description: districtFormData.description,
            federal_state_id: districtFormData.federal_state_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDistrict.id);

        if (error) throw error;
      } else {
        const stateDistricts = districts.filter(d => d.federal_state_id === districtFormData.federal_state_id);
        const maxSortOrder = stateDistricts.length > 0
          ? Math.max(...stateDistricts.map(d => d.sort_order || 0))
          : 0;

        const { error } = await supabase
          .from('districts')
          .insert([{
            name: districtFormData.name,
            description: districtFormData.description,
            federal_state_id: districtFormData.federal_state_id,
            sort_order: maxSortOrder + 1
          }]);

        if (error) throw error;
      }

      setDistrictFormData({ name: '', description: '', federal_state_id: '' });
      setShowDistrictForm(false);
      setEditingDistrict(null);
      loadData();
    } catch (error) {
      console.error('Error saving district:', error);
    }
  };

  const handleEditFederalState = (state: FederalState) => {
    setEditingFederalState(state);
    setFederalStateFormData({
      name: state.name,
      description: state.description || ''
    });
    setShowFederalStateForm(true);
  };

  const handleEditDistrict = (district: District) => {
    setEditingDistrict(district);
    setDistrictFormData({
      name: district.name,
      description: district.description || '',
      federal_state_id: district.federal_state_id
    });
    setShowDistrictForm(true);
  };

  const handleDeleteFederalState = async (id: string) => {
    if (!confirm('Möchten Sie dieses Bundesland wirklich löschen? Alle zugehörigen Regionen werden ebenfalls gelöscht.')) return;

    try {
      const { error } = await supabase
        .from('regions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting federal state:', error);
    }
  };

  const handleDeleteDistrict = async (id: string) => {
    if (!confirm('Möchten Sie diese Region wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('districts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting district:', error);
    }
  };

  const handleCancelFederalState = () => {
    setShowFederalStateForm(false);
    setEditingFederalState(null);
    setFederalStateFormData({ name: '', description: '' });
  };

  const handleCancelDistrict = () => {
    setShowDistrictForm(false);
    setEditingDistrict(null);
    setDistrictFormData({ name: '', description: '', federal_state_id: '' });
  };

  const handleStateDragStart = (index: number) => {
    setDraggedStateIndex(index);
  };

  const handleStateDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStateIndex === null || draggedStateIndex === index) return;

    const newStates = [...federalStates];
    const draggedItem = newStates[draggedStateIndex];
    newStates.splice(draggedStateIndex, 1);
    newStates.splice(index, 0, draggedItem);

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
          .from('regions')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating federal state sort order:', error);
      loadData();
    } finally {
      setDraggedStateIndex(null);
    }
  };

  const handleDistrictDragStart = (index: number, stateId: string) => {
    setDraggedDistrictIndex(index);
    setDraggedDistrictStateId(stateId);
  };

  const handleDistrictDragOver = (e: React.DragEvent, index: number, stateId: string) => {
    e.preventDefault();
    if (draggedDistrictIndex === null || draggedDistrictStateId !== stateId) return;

    const stateDistricts = getDistrictsForState(stateId);
    if (draggedDistrictIndex === index) return;

    const newDistricts = [...stateDistricts];
    const draggedItem = newDistricts[draggedDistrictIndex];
    newDistricts.splice(draggedDistrictIndex, 1);
    newDistricts.splice(index, 0, draggedItem);

    const otherDistricts = districts.filter(d => d.federal_state_id !== stateId);
    setDistricts([...otherDistricts, ...newDistricts]);
    setDraggedDistrictIndex(index);
  };

  const handleDistrictDragEnd = async () => {
    if (draggedDistrictIndex === null || !draggedDistrictStateId) return;

    try {
      const stateDistricts = getDistrictsForState(draggedDistrictStateId);
      const updates = stateDistricts.map((district, index) => ({
        id: district.id,
        sort_order: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('districts')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating district sort order:', error);
      loadData();
    } finally {
      setDraggedDistrictIndex(null);
      setDraggedDistrictStateId(null);
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
            Verwalten Sie österreichische Bundesländer und deren Regionen.
          </p>
        </div>
        <div className="flex gap-2">
          {!showFederalStateForm && !showDistrictForm && (
            <>
              <button
                onClick={() => setShowFederalStateForm(true)}
                className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Bundesland
              </button>
              <button
                onClick={() => setShowDistrictForm(true)}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Region
              </button>
            </>
          )}
        </div>
      </div>

      {showFederalStateForm && (
        <form onSubmit={handleFederalStateSubmit} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingFederalState ? 'Bundesland bearbeiten' : 'Neues Bundesland'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={federalStateFormData.name}
                onChange={(e) => setFederalStateFormData({ ...federalStateFormData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung
              </label>
              <textarea
                value={federalStateFormData.description}
                onChange={(e) => setFederalStateFormData({ ...federalStateFormData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {editingFederalState ? 'Aktualisieren' : 'Erstellen'}
              </button>
              <button
                type="button"
                onClick={handleCancelFederalState}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </form>
      )}

      {showDistrictForm && (
        <form onSubmit={handleDistrictSubmit} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingDistrict ? 'Region bearbeiten' : 'Neue Region'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bundesland *
              </label>
              <select
                value={districtFormData.federal_state_id}
                onChange={(e) => setDistrictFormData({ ...districtFormData, federal_state_id: e.target.value })}
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
                value={districtFormData.name}
                onChange={(e) => setDistrictFormData({ ...districtFormData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung
              </label>
              <textarea
                value={districtFormData.description}
                onChange={(e) => setDistrictFormData({ ...districtFormData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-[#2e2e2e] font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {editingDistrict ? 'Aktualisieren' : 'Erstellen'}
              </button>
              <button
                type="button"
                onClick={handleCancelDistrict}
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
          const stateDistricts = getDistrictsForState(state.id);
          const isExpanded = expandedStates.has(state.id);

          return (
            <div
              key={state.id}
              draggable={!showFederalStateForm && !showDistrictForm}
              onDragStart={() => handleStateDragStart(stateIndex)}
              onDragOver={(e) => handleStateDragOver(e, stateIndex)}
              onDragEnd={handleStateDragEnd}
              className="bg-white border border-slate-200 rounded-lg overflow-hidden cursor-move"
            >
              <div className="flex items-center p-4 hover:bg-slate-50 transition-colors">
                {!showFederalStateForm && !showDistrictForm && (
                  <GripVertical className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
                )}
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
                    <p className="text-sm text-gray-500">
                      {stateDistricts.length} {stateDistricts.length === 1 ? 'Region' : 'Regionen'}
                    </p>
                  </div>
                </button>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEditFederalState(state)}
                    className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="Bearbeiten"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFederalState(state.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-2">
                  {stateDistricts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Keine Regionen in diesem Bundesland. Fügen Sie eine neue Region hinzu.
                    </div>
                  ) : (
                    stateDistricts.map((district, districtIndex) => (
                      <div
                        key={district.id}
                        draggable={!showFederalStateForm && !showDistrictForm}
                        onDragStart={() => handleDistrictDragStart(districtIndex, state.id)}
                        onDragOver={(e) => handleDistrictDragOver(e, districtIndex, state.id)}
                        onDragEnd={handleDistrictDragEnd}
                        className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-all cursor-move"
                      >
                        <div className="flex items-center gap-3">
                          {!showFederalStateForm && !showDistrictForm && (
                            <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{district.name}</h4>
                            {district.description && (
                              <p className="text-sm text-gray-600 mt-1">{district.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleEditDistrict(district)}
                              className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                              title="Bearbeiten"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDistrict(district.id)}
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
