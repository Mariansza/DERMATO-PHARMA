import React, { useState, useMemo, useEffect } from 'react';
import { listCases } from '@/firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Clock, AlertCircle, Search, Filter, Users, TrendingUp, LogOut, Euro, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const { user, isAuthenticated, isLoadingAuth, logout, navigateToLogin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [selectedDoctor, setSelectedDoctor] = useState('all');

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigateToLogin();
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin]);

  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => listCases('created_date', 'desc', 500),
    enabled: isAuthenticated
  });

  const handleLogout = () => {
    logout(createPageUrl('Home'));
  };

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // Filtrer par medecin : voir toutes les demandes non assignees OU les demandes assignees a soi
      const isAssignedToMe = c.assigned_derm_id === user?.id;
      const isUnassigned = !c.assigned_derm_id || c.assigned_derm_id === '' || c.status === 'En attente';
      const canSeeCase = isUnassigned || isAssignedToMe;

      if (!canSeeCase) return false;

      const matchesSearch = c.public_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.pharmacist_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.pharmacy_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesUrgency = urgencyFilter === 'all' || c.perceived_urgency === urgencyFilter;
      return matchesSearch && matchesStatus && matchesUrgency;
    });
  }, [cases, searchTerm, statusFilter, urgencyFilter, user]);

  const stats = useMemo(() => {
    const total = cases.length;
    const enAttente = cases.filter(c => c.status === 'En attente').length;
    const enCours = cases.filter(c => c.status === 'En cours').length;
    const termine = cases.filter(c => c.status === 'Termine').length;
    const slaDepasse = cases.filter(c => {
      if (!c.sla_due_at || c.status === 'Termine') return false;
      const dueDate = c.sla_due_at?.toDate ? c.sla_due_at.toDate() : new Date(c.sla_due_at);
      return dueDate < new Date();
    }).length;

    return { total, enAttente, enCours, termine, slaDepasse };
  }, [cases]);

  // Statistiques par medecin pour les cas termines
  const doctorStats = useMemo(() => {
    const completedCases = cases.filter(c => c.status === 'Termine' && c.assigned_derm_id && c.assigned_derm_name);
    const stats = {};

    completedCases.forEach(c => {
      const doctorId = c.assigned_derm_id;
      if (!stats[doctorId]) {
        stats[doctorId] = {
          id: doctorId,
          name: c.assigned_derm_name,
          count: 0,
          cases: []
        };
      }
      stats[doctorId].count++;
      stats[doctorId].cases.push(c);
    });

    return Object.values(stats).sort((a, b) => b.count - a.count);
  }, [cases]);

  const filteredDoctorCases = useMemo(() => {
    if (selectedDoctor === 'all') {
      return cases.filter(c => c.status === 'Termine' && c.assigned_derm_id);
    }
    return cases.filter(c => c.status === 'Termine' && c.assigned_derm_id === selectedDoctor);
  }, [cases, selectedDoctor]);

  const getStatusColor = (status) => {
    const colors = {
      'En attente': 'bg-blue-100 text-blue-800',
      'En cours': 'bg-purple-100 text-purple-800',
      'Termine': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      'Faible': 'text-green-600',
      'Moderee': 'text-orange-600',
      'Elevee': 'text-red-600'
    };
    return colors[urgency] || 'text-gray-600';
  };

  const getSLAStatus = (caseRecord) => {
    if (!caseRecord.sla_due_at || caseRecord.status === 'Termine') return null;
    const now = new Date();
    const due = caseRecord.sla_due_at?.toDate ? caseRecord.sla_due_at.toDate() : new Date(caseRecord.sla_due_at);
    const diff = due - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 0) return { text: 'Depasse', color: 'text-red-600', badge: 'bg-red-100 text-red-800' };
    if (hours < 12) return { text: `${hours}h restantes`, color: 'text-orange-600', badge: 'bg-orange-100 text-orange-800' };
    return { text: `${hours}h restantes`, color: 'text-green-600', badge: 'bg-green-100 text-green-800' };
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleDateString('fr-FR');
  };

  if (isLoadingAuth || !isAuthenticated || casesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Clock className="h-8 w-8 animate-spin" style={{ color: '#1a3d3d' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#1a3d3d' }}>Dashboard Teleexpertise</h1>
            <p className="text-gray-600">Gestion des dossiers dermatologiques - Connecte : {user?.full_name || user?.email}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Deconnexion
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total</p>
                <p className="text-3xl font-bold" style={{ color: '#1a3d3d' }}>{stats.total}</p>
              </div>
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">En attente</p>
                <p className="text-3xl font-bold text-blue-600">{stats.enAttente}</p>
              </div>
              <Users className="h-10 w-10 text-blue-400" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">En cours</p>
                <p className="text-3xl font-bold text-purple-600">{stats.enCours}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-400" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Termines</p>
                <p className="text-3xl font-bold text-green-600">{stats.termine}</p>
              </div>
              <FileText className="h-10 w-10 text-green-400" />
            </div>
          </Card>

          <Card className="p-6 bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 mb-1">SLA depasse</p>
                <p className="text-3xl font-bold text-red-600">{stats.slaDepasse}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-400" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Rechercher par reference, pharmacien, pharmacie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="En attente">En attente</SelectItem>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="Termine">Termine</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-full md:w-48">
                <AlertCircle className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Urgence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes urgences</SelectItem>
                <SelectItem value="Faible">Faible</SelectItem>
                <SelectItem value="Moderee">Moderee</SelectItem>
                <SelectItem value="Elevee">Elevee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="cases" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="cases">Dossiers</TabsTrigger>
            {user?.email?.endsWith('@tessan.io') && (
              <TabsTrigger value="data">
                <Euro className="h-4 w-4 mr-2" />
                Donnees / Paiements
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="cases">
            {/* Cases Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pharmacien</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pharmacie</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgence</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SLA</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCases.map((caseRecord) => {
                      const sla = getSLAStatus(caseRecord);
                      return (
                        <tr key={caseRecord.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-sm font-medium" style={{ color: '#1a3d3d' }}>
                              {caseRecord.public_reference}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(caseRecord.created_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div>
                              <p className="font-medium">{caseRecord.pharmacist_name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div>
                              <p>{caseRecord.pharmacy_name}</p>
                              <p className="text-xs text-gray-500">{caseRecord.pharmacy_city}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${getUrgencyColor(caseRecord.perceived_urgency)}`}>
                              {caseRecord.perceived_urgency}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(caseRecord.status)}>
                              {caseRecord.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {sla && (
                              <Badge className={sla.badge}>
                                {sla.text}
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Link to={createPageUrl('CaseDetail') + `?id=${caseRecord.id}`}>
                              <Button size="sm" variant="outline">Voir</Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredCases.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Aucun dossier trouve</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {user?.email?.endsWith('@tessan.io') && (
            <TabsContent value="data">
              {/* Doctor Statistics */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {doctorStats.map(doc => (
                  <Card key={doc.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{doc.name}</p>
                        <p className="text-3xl font-bold" style={{ color: '#1a3d3d' }}>{doc.count}</p>
                        <p className="text-xs text-gray-500 mt-1">expertises terminees</p>
                      </div>
                      <Users className="h-10 w-10 text-gray-400" />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Filter by Doctor */}
              <Card className="p-6 mb-6">
                <div className="flex items-center gap-4">
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger className="w-64">
                      <Users className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrer par medecin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les medecins ({cases.filter(c => c.status === 'Termine' && c.assigned_derm_id).length})</SelectItem>
                      {doctorStats.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.name} ({doc.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-sm text-gray-600">
                    {filteredDoctorCases.length} expertise{filteredDoctorCases.length > 1 ? 's' : ''} terminee{filteredDoctorCases.length > 1 ? 's' : ''}
                  </div>
                </div>
              </Card>

              {/* Filtered Cases Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medecin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cloture le</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredDoctorCases.map((caseRecord) => (
                        <tr key={caseRecord.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-sm font-medium" style={{ color: '#1a3d3d' }}>
                              {caseRecord.public_reference}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(caseRecord.created_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <p className="font-medium">{caseRecord.assigned_derm_name}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <p>{caseRecord.patient_first_name} {caseRecord.patient_last_name}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {caseRecord.closed_at ? formatDate(caseRecord.closed_at) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              {caseRecord.prescription_url ? (
                                <a href={caseRecord.prescription_url} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline" className="text-xs">
                                    <Download className="h-3 w-3 mr-1" />
                                    Ordonnance
                                  </Button>
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                              {caseRecord.report_url ? (
                                <a href={caseRecord.report_url} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline" className="text-xs">
                                    <Download className="h-3 w-3 mr-1" />
                                    Compte rendu
                                  </Button>
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Link to={createPageUrl('CaseDetail') + `?id=${caseRecord.id}`}>
                              <Button size="sm" variant="outline">Voir</Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredDoctorCases.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">Aucune expertise terminee trouvee</p>
                  </div>
                )}
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
