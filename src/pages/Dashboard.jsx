import React, { useState, useMemo, useEffect } from 'react';
import { listCases, listUsers } from '@/firebase/firestore';
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
import { FileText, Clock, AlertCircle, Search, Filter, Users, TrendingUp, LogOut, Download, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const { user, isAuthenticated, isLoadingAuth, logout, navigateToLogin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

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

  // Récupérer la liste des utilisateurs (pour super_user uniquement)
  const isSuperUser = user?.role === 'super_user';
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers(),
    enabled: isAuthenticated && isSuperUser
  });

  // Créer un mapping userId -> nom complet pour l'affichage
  const userNamesMap = useMemo(() => {
    const map = {};
    allUsers.forEach(u => {
      map[u.id] = u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Inconnu';
    });
    return map;
  }, [allUsers]);

  const handleLogout = () => {
    logout(createPageUrl('Home'));
  };

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // Tous les utilisateurs : voir les demandes non assignées OU les demandes assignées à soi
      const isAssignedToMe = c.assigned_derm_id === user?.id;
      const isUnassigned = !c.assigned_derm_id || c.assigned_derm_id === '' || c.status === 'En attente';
      const canSeeCase = isUnassigned || isAssignedToMe;

      if (!canSeeCase) return false;

      const patientFullName = `${c.patient_first_name || ''} ${c.patient_last_name || ''}`.toLowerCase();
      const matchesSearch = c.public_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           patientFullName.includes(searchTerm.toLowerCase()) ||
                           c.pharmacy_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Gérer les filtres avec et sans accents
      const statusVariants = {
        'Terminé': ['Terminé', 'Termine'],
        'En attente': ['En attente'],
        'En cours': ['En cours']
      };
      const urgencyVariants = {
        'Modérée': ['Modérée', 'Moderee'],
        'Élevée': ['Élevée', 'Elevee'],
        'Faible': ['Faible']
      };

      const matchesStatus = statusFilter === 'all' ||
        (statusVariants[statusFilter] ? statusVariants[statusFilter].includes(c.status) : c.status === statusFilter);
      const matchesUrgency = urgencyFilter === 'all' ||
        (urgencyVariants[urgencyFilter] ? urgencyVariants[urgencyFilter].includes(c.perceived_urgency) : c.perceived_urgency === urgencyFilter);

      return matchesSearch && matchesStatus && matchesUrgency;
    });
  }, [cases, searchTerm, statusFilter, urgencyFilter, user]);

  const stats = useMemo(() => {
    const total = cases.length;
    const enAttente = cases.filter(c => c.status === 'En attente').length;
    const enCours = cases.filter(c => c.status === 'En cours').length;
    const termine = cases.filter(c => c.status === 'Terminé' || c.status === 'Termine').length;
    const slaDepasse = cases.filter(c => {
      if (!c.sla_due_at || c.status === 'Terminé' || c.status === 'Termine') return false;
      const dueDate = c.sla_due_at?.toDate ? c.sla_due_at.toDate() : new Date(c.sla_due_at);
      return dueDate < new Date();
    }).length;

    return { total, enAttente, enCours, termine, slaDepasse };
  }, [cases]);

  const myCases = useMemo(() => {
    return cases.filter(c => (c.status === 'Terminé' || c.status === 'Termine') && c.assigned_derm_id === user?.id);
  }, [cases, user]);

  // Tous les dossiers terminés (pour super_user uniquement)
  const allCompletedCases = useMemo(() => {
    if (!isSuperUser) return [];
    return cases.filter(c => c.status === 'Terminé' || c.status === 'Termine');
  }, [cases, isSuperUser]);

  const getStatusColor = (status) => {
    const colors = {
      'En attente': 'bg-blue-100 text-blue-800',
      'En cours': 'bg-purple-100 text-purple-800',
      'Terminé': 'bg-green-100 text-green-800',
      'Termine': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      'Faible': 'text-green-600',
      'Modérée': 'text-orange-600',
      'Moderee': 'text-orange-600',
      'Élevée': 'text-red-600',
      'Elevee': 'text-red-600'
    };
    return colors[urgency] || 'text-gray-600';
  };

  // Normaliser les valeurs pour l'affichage (ajouter les accents)
  const normalizeStatus = (status) => {
    const mapping = { 'Termine': 'Terminé' };
    return mapping[status] || status;
  };

  const normalizeUrgency = (urgency) => {
    const mapping = { 'Moderee': 'Modérée', 'Elevee': 'Élevée' };
    return mapping[urgency] || urgency;
  };

  const getSLAStatus = (caseRecord) => {
    if (!caseRecord.sla_due_at || caseRecord.status === 'Terminé' || caseRecord.status === 'Termine') return null;
    const now = new Date();
    const due = caseRecord.sla_due_at?.toDate ? caseRecord.sla_due_at.toDate() : new Date(caseRecord.sla_due_at);
    const diff = due - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 0) return { text: 'Dépassé', color: 'text-red-600', badge: 'bg-red-100 text-red-800' };
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
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold" style={{ color: '#1a3d3d' }}>Dashboard Téléexpertise</h1>
              {isSuperUser && (
                <Badge className="bg-purple-100 text-purple-800">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-gray-600">Gestion des dossiers dermatologiques - Connecté : {user?.full_name || user?.email}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
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
                <p className="text-sm text-gray-600 mb-1">Terminés</p>
                <p className="text-3xl font-bold text-green-600">{stats.termine}</p>
              </div>
              <FileText className="h-10 w-10 text-green-400" />
            </div>
          </Card>

          <Card className="p-6 bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 mb-1">SLA dépassé</p>
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
                placeholder="Rechercher par référence, patient, pharmacie..."
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
                <SelectItem value="Terminé">Terminé</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="cases" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="cases">Tous les Dossiers</TabsTrigger>
            <TabsTrigger value="data">Mes dossiers traités</TabsTrigger>
            {isSuperUser && (
              <TabsTrigger value="all-completed">Tous les dossiers traités</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="cases">
            {/* Cases Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pharmacie</th>
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
                              <p className="font-medium">{caseRecord.patient_first_name} {caseRecord.patient_last_name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div>
                              <p>{caseRecord.pharmacy_name}</p>
                              {caseRecord.pharmacist_phone && (
                                <p className="text-xs text-gray-500">{caseRecord.pharmacist_phone}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(caseRecord.status)}>
                              {normalizeStatus(caseRecord.status)}
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
                  <p className="text-gray-600">Aucun dossier trouvé</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="data">
              {/* My Cases Counter */}
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  {myCases.length} expertise{myCases.length > 1 ? 's' : ''} terminée{myCases.length > 1 ? 's' : ''}
                </p>
              </div>

              {/* My Cases Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clôturé le</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {myCases.map((caseRecord) => (
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

                {myCases.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">Vous n'avez pas encore d'expertise terminée</p>
                  </div>
                )}
              </Card>
            </TabsContent>

          {/* Onglet Super User : Tous les dossiers traités */}
          {isSuperUser && (
            <TabsContent value="all-completed">
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  {allCompletedCases.length} dossier{allCompletedCases.length > 1 ? 's' : ''} terminé{allCompletedCases.length > 1 ? 's' : ''} (tous médecins confondus)
                </p>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pharmacie</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Médecin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clôturé le</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {allCompletedCases.map((caseRecord) => (
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
                            <p>{caseRecord.patient_first_name} {caseRecord.patient_last_name}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <p>{caseRecord.pharmacy_name}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="font-medium" style={{ color: '#1a3d3d' }}>
                              {caseRecord.assigned_derm_id
                                ? userNamesMap[caseRecord.assigned_derm_id] || 'Médecin inconnu'
                                : '-'}
                            </span>
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

                {allCompletedCases.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">Aucun dossier terminé</p>
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
