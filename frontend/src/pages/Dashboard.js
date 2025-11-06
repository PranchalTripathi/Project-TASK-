import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { eventsAPI } from '../services/api';
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Edit3, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  Filter,
  Search
} from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import toast from 'react-hot-toast';
import CreateEventModal from '../components/CreateEventModal';
import EditEventModal from '../components/EditEventModal';

const Dashboard = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const queryClient = useQueryClient();

  // Fetch user's events
  const { data: eventsData, isLoading, error } = useQuery(
    ['events', filter],
    () => eventsAPI.getEvents({ 
      status: filter === 'all' ? undefined : filter.toUpperCase(),
      includeAll: true 
    }),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Delete event mutation
  const deleteEventMutation = useMutation(
    (eventId) => eventsAPI.deleteEvent(eventId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['events']);
        toast.success('Event deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete event');
      },
    }
  );

  // Toggle event status mutation
  const toggleStatusMutation = useMutation(
    ({ eventId, status }) => eventsAPI.updateEventStatus(eventId, status),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['events']);
        toast.success('Event status updated');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update status');
      },
    }
  );

  const events = eventsData?.data?.events || [];

  // Filter events based on search term
  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteEvent = (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate(eventId);
    }
  };

  const handleToggleStatus = (event) => {
    const newStatus = event.status === 'SWAPPABLE' ? 'BUSY' : 'SWAPPABLE';
    toggleStatusMutation.mutate({ eventId: event._id, status: newStatus });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      BUSY: 'status-busy',
      SWAPPABLE: 'status-swappable',
      SWAP_PENDING: 'status-swap-pending',
    };
    
    return (
      <span className={statusClasses[status] || 'status-busy'}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getCategoryIcon = (category) => {
    const icons = {
      work: '💼',
      personal: '👤',
      meeting: '🤝',
      appointment: '📅',
      other: '📋',
    };
    return icons[category] || icons.other;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 rounded-2xl text-center">
        <p className="text-red-600">Failed to load events. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Calendar</h1>
            <p className="text-gray-600 mt-1">
              Manage your events and time slots
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter size={20} className="text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-field min-w-32"
            >
              <option value="all">All Events</option>
              <option value="busy">Busy</option>
              <option value="swappable">Swappable</option>
              <option value="swap_pending">Swap Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="glass-card p-6 rounded-2xl">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No matching events found' : 'No events yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Create your first event to get started'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                Create Event
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div
                key={event._id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 bg-white/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">
                        {getCategoryIcon(event.category)}
                      </span>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="text-gray-600 text-sm mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar size={16} />
                        <span>
                          {format(parseISO(event.startTime), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock size={16} />
                        <span>
                          {format(parseISO(event.startTime), 'h:mm a')} - {' '}
                          {format(parseISO(event.endTime), 'h:mm a')}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin size={16} />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(event.status)}
                        <span className="text-xs text-gray-500 capitalize">
                          {event.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Toggle Status */}
                    {event.status !== 'SWAP_PENDING' && 
                     isAfter(parseISO(event.startTime), new Date()) && (
                      <button
                        onClick={() => handleToggleStatus(event)}
                        className="p-2 text-gray-500 hover:text-primary-600 transition-colors"
                        title={`Mark as ${event.status === 'SWAPPABLE' ? 'Busy' : 'Swappable'}`}
                      >
                        {event.status === 'SWAPPABLE' ? (
                          <ToggleRight size={20} className="text-green-600" />
                        ) : (
                          <ToggleLeft size={20} />
                        )}
                      </button>
                    )}

                    {/* Edit */}
                    {event.status !== 'SWAP_PENDING' && (
                      <button
                        onClick={() => setEditingEvent(event)}
                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                        title="Edit Event"
                      >
                        <Edit3 size={18} />
                      </button>
                    )}

                    {/* Delete */}
                    {event.status !== 'SWAP_PENDING' && (
                      <button
                        onClick={() => handleDeleteEvent(event._id)}
                        className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateEventModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {editingEvent && (
        <EditEventModal
          isOpen={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          event={editingEvent}
        />
      )}
    </div>
  );
};

export default Dashboard;