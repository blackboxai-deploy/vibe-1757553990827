'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash, MapPin, Phone, Mail, Calendar, User, Clock } from "lucide-react";
import { useSystemContext } from '@/contexts/SystemContext';
import { Cliente, Evento } from '@/types';

// Funções de formatação
const formatCPFCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  // CNPJ
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

const formatRGField = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
};

// Função para buscar bairro por endereço no Rio de Janeiro
const buscarBairroRJ = async (endereco: string) => {
  try {
    // Mapeamento de bairros conhecidos do Rio de Janeiro
    const bairrosRJ: { [key: string]: string } = {
      'copacabana': 'Copacabana',
      'ipanema': 'Ipanema', 
      'leblon': 'Leblon',
      'barra': 'Barra da Tijuca',
      'tijuca': 'Tijuca',
      'centro': 'Centro',
      'botafogo': 'Botafogo',
      'flamengo': 'Flamengo',
      'gloria': 'Glória',
      'santa teresa': 'Santa Teresa',
      'lapa': 'Lapa',
      'recreio': 'Recreio dos Bandeirantes',
      'jacarepagua': 'Jacarepaguá',
      'méier': 'Méier',
      'madureira': 'Madureira',
      'campo grande': 'Campo Grande',
      'santa cruz': 'Santa Cruz',
      'zona sul': 'Zona Sul',
      'zona norte': 'Zona Norte',
      'zona oeste': 'Zona Oeste',
      'laranjeiras': 'Laranjeiras',
      'urca': 'Urca',
      'gávea': 'Gávea',
      'lagoa': 'Lagoa',
      'humaitá': 'Humaitá'
    };

    const enderecoLower = endereco.toLowerCase();
    
    // Busca por palavras-chave no endereço
    for (const [keyword, bairro] of Object.entries(bairrosRJ)) {
      if (enderecoLower.includes(keyword)) {
        return bairro;
      }
    }

    // Se não encontrar por nome, tenta buscar por CEP
    const cepRegex = /\b\d{5}-?\d{3}\b/;
    const cepMatch = endereco.match(cepRegex);
    
    if (cepMatch) {
      const cep = cepMatch[0].replace('-', '');
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro && data.localidade?.toLowerCase().includes('rio de janeiro')) {
        return data.bairro || '';
      }
    }

    return '';
  } catch (error) {
    console.error('Erro ao buscar bairro:', error);
    return '';
  }
};

// Função para buscar informações completas de endereço via CEP
const buscarEnderecoPorCEP = async (cep: string) => {
  try {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return null;
    
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();
    
    if (!data.erro) {
      return {
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || ''
      };
    }
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
  }
  return null;
};

// Função para extrair CEP do endereço
const extrairCEP = (endereco: string) => {
  const cepRegex = /\b\d{5}-?\d{3}\b/;
  const match = endereco.match(cepRegex);
  return match ? match[0].replace(/\D/g, '') : null;
};

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const COMO_CONHECEU_OPCOES = ['Instagram', 'Facebook', 'Google', 'Indicação de Amigos', 'Whatsapp', 'Site', 'Panfleto', 'Evento Anterior', 'Outros'];
const FAIXAS_ETARIAS = ['0-2 anos', '3-5 anos', '6-8 anos', '9-12 anos', 'Adolescentes (13-17)', 'Adultos (18+)'];

const ClientsModule: React.FC = () => {
  const { clientes, setClientes } = useSystemContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  
  const [formData, setFormData] = useState({
    // Dados Pessoais
    nomeCompleto: '',
    cpfCnpj: '',
    rg: '',
    numeroCelular: '',
    enderecoResidencia: '',
    email: '',
    // Local da Festa
    enderecoFesta: '',
    blocoApartamento: '',
    nomeCondominio: '',
    bairroFesta: '',
    moraNoLocal: true,
    responsavelLocal: '',
    pontoReferencia: '',
    // Data e Horário
    data: '',
    diaSemana: '',
    inicioFesta: '',
    finalFesta: '',
    // Marketing
    comoConheceu: '',
    instagram: '',
    // Aniversariante
    nomeAniversariante: '',
    idadeAniversariante: 0,
    temaFesta: '',
    // Tipo de Serviço/Pacote
    descricaoCompletaPacote: '',
    // Convidados
    numeroCriancasPrevisto: 0,
    idadeCriancas: '',
    numeroConvidadosPrevisto: 0,
    restricoesGeneroMusical: ''
  });

  const filteredClientes = clientes.filter((cliente: Cliente) => {
    const nome = (cliente as any).nomeCompleto || (cliente as any).nome || '';
    const email = cliente.email || '';
    const aniversariante = (cliente as any).nomeAniversariante || '';
    
    return nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
           email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           aniversariante.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSave = () => {
    if (!formData.nomeCompleto || !formData.email || !formData.numeroCelular) {
      alert('Preencha os campos obrigatórios: Nome Completo, E-mail e Celular');
      return;
    }

    const clienteData = {
      ...formData,
      nome: formData.nomeCompleto,
      telefone: formData.numeroCelular,
      endereco: formData.enderecoResidencia,
    };

    if (editingClient) {
      setClientes(clientes.map((c: Cliente) => 
        c.id === editingClient.id ? { 
          ...editingClient, 
          ...clienteData,
          totalEventos: editingClient.totalEventos,
          dataUltimoEvento: editingClient.dataUltimoEvento
        } as Cliente : c
      ));
    } else {
      const newClient: Cliente = {
        id: Date.now().toString(),
        ...clienteData,
        totalEventos: 0
      } as Cliente;
      setClientes([...clientes, newClient]);
    }
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingClient(null);
    setFormData({
      nomeCompleto: '',
      cpfCnpj: '',
      rg: '',
      numeroCelular: '',
      enderecoResidencia: '',
      email: '',
      enderecoFesta: '',
      blocoApartamento: '',
      nomeCondominio: '',
      bairroFesta: '',
      moraNoLocal: true,
      responsavelLocal: '',
      pontoReferencia: '',
      data: '',
      diaSemana: '',
      inicioFesta: '',
      finalFesta: '',
      comoConheceu: '',
      instagram: '',
      nomeAniversariante: '',
      idadeAniversariante: 0,
      temaFesta: '',
      descricaoCompletaPacote: '',
      numeroCriancasPrevisto: 0,
      idadeCriancas: '',
      numeroConvidadosPrevisto: 0,
      restricoesGeneroMusical: ''
    });
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingClient(cliente);
    setFormData({
      nomeCompleto: (cliente as any).nomeCompleto || (cliente as any).nome || '',
      cpfCnpj: (cliente as any).cpfCnpj || '',
      rg: (cliente as any).rg || '',
      numeroCelular: (cliente as any).numeroCelular || (cliente as any).telefone || '',
      enderecoResidencia: (cliente as any).enderecoResidencia || (cliente as any).endereco || '',
      email: cliente.email || '',
      enderecoFesta: (cliente as any).enderecoFesta || '',
      blocoApartamento: (cliente as any).blocoApartamento || '',
      nomeCondominio: (cliente as any).nomeCondominio || '',
      bairroFesta: (cliente as any).bairroFesta || '',
      moraNoLocal: (cliente as any).moraNoLocal !== undefined ? (cliente as any).moraNoLocal : true,
      responsavelLocal: (cliente as any).responsavelLocal || '',
      pontoReferencia: (cliente as any).pontoReferencia || '',
      data: (cliente as any).data || '',
      diaSemana: (cliente as any).diaSemana || '',
      inicioFesta: (cliente as any).inicioFesta || (cliente as any).horarioFesta || '',
      finalFesta: (cliente as any).finalFesta || '',
      comoConheceu: (cliente as any).comoConheceu || '',
      instagram: (cliente as any).instagram || '',
      nomeAniversariante: (cliente as any).nomeAniversariante || '',
      idadeAniversariante: (cliente as any).idadeAniversariante || 0,
      temaFesta: (cliente as any).temaFesta || '',
      descricaoCompletaPacote: (cliente as any).descricaoCompletaPacote || '',
      numeroCriancasPrevisto: (cliente as any).numeroCriancasPrevisto || 0,
      idadeCriancas: (cliente as any).idadeCriancas || '',
      numeroConvidadosPrevisto: (cliente as any).numeroConvidadosPrevisto || 0,
      restricoesGeneroMusical: (cliente as any).restricoesGeneroMusical || ''
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este contrato?')) {
      setClientes(clientes.filter((c: Cliente) => c.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contratos - Festas Fechadas</h1>
          <p className="text-gray-600">Gerencie contratos e informações completas das festas</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-pink-500 hover:bg-pink-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato/Evento
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar contratos por nome, email ou aniversariante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingClient ? 'Editar Contrato' : 'Novo Contrato/Evento'}</CardTitle>
            <CardDescription>Preencha todas as informações do contrato e da festa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Dados Pessoais */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-pink-500" />
                Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                  <Input
                    id="nomeCompleto"
                    value={formData.nomeCompleto}
                    onChange={(e) => setFormData({...formData, nomeCompleto: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
                  <Input
                    id="cpfCnpj"
                    value={formData.cpfCnpj}
                    onChange={(e) => {
                      const formatted = formatCPFCNPJ(e.target.value);
                      setFormData({...formData, cpfCnpj: formatted});
                    }}
                    placeholder="Digite apenas números"
                    maxLength={18}
                  />
                  <p className="text-xs text-gray-500 mt-1">🤖 Formatação automática: CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)</p>
                </div>
                <div>
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={(e) => {
                      const formatted = formatRGField(e.target.value);
                      setFormData({...formData, rg: formatted});
                    }}
                    placeholder="Digite apenas números"
                    maxLength={12}
                  />
                  <p className="text-xs text-gray-500 mt-1">🤖 Formatação automática: 00.000.000-0</p>
                </div>
                <div>
                  <Label htmlFor="numeroCelular">Número Celular *</Label>
                  <Input
                    id="numeroCelular"
                    value={formData.numeroCelular}
                    onChange={(e) => setFormData({...formData, numeroCelular: e.target.value})}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="enderecoResidencia">Endereço de Residência</Label>
                  <Input
                    id="enderecoResidencia"
                    value={formData.enderecoResidencia}
                    onChange={async (e) => {
                      const endereco = e.target.value;
                      setFormData(prev => ({...prev, enderecoResidencia: endereco}));
                      
                      // Auto-completar se CEP for detectado
                      const cep = extrairCEP(endereco);
                      if (cep && cep.length === 8) {
                        const dadosEndereco = await buscarEnderecoPorCEP(cep);
                        if (dadosEndereco) {
                          const enderecoCompleto = `${endereco} - ${dadosEndereco.bairro}, ${dadosEndereco.cidade}/${dadosEndereco.uf}`;
                          setFormData(prev => ({...prev, enderecoResidencia: enderecoCompleto}));
                        }
                      }
                    }}
                    placeholder="Rua, número, CEP (ex: Rua das Flores 123, 01234567)"
                  />
                  <p className="text-xs text-gray-500 mt-1">💡 Digite o CEP para auto-completar endereço</p>
                </div>
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Local da Festa */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-purple-500" />
                Local da Festa
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="enderecoFesta">Endereço da Festa</Label>
                  <Input
                    id="enderecoFesta"
                    value={formData.enderecoFesta}
                    onChange={async (e) => {
                      const endereco = e.target.value;
                      setFormData(prev => ({...prev, enderecoFesta: endereco}));
                      
                      // Auto-completar bairro baseado no endereço (Rio de Janeiro)
                      if (endereco.trim().length > 10) { // Aguarda pelo menos rua e número
                        setLoadingAddress(true);
                        const bairro = await buscarBairroRJ(endereco);
                        if (bairro) {
                          setFormData(prev => ({
                            ...prev, 
                            bairroFesta: bairro
                          }));
                        }
                        setLoadingAddress(false);
                      }
                    }}
                    placeholder="Rua e Número (ex: Rua das Festas 456 - Rio de Janeiro)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Digite a rua e número, o bairro será identificado automaticamente (Rio de Janeiro)
                    {loadingAddress && " 🔄 Buscando bairro..."}
                  </p>
                </div>
                <div>
                  <Label htmlFor="blocoApartamento">Bloco e Apartamento</Label>
                  <Input
                    id="blocoApartamento"
                    value={formData.blocoApartamento}
                    onChange={(e) => setFormData({...formData, blocoApartamento: e.target.value})}
                    placeholder="Bloco A - Apt 101"
                  />
                </div>
                <div>
                  <Label htmlFor="nomeCondominio">Nome do Condomínio/Espaço</Label>
                  <Input
                    id="nomeCondominio"
                    value={formData.nomeCondominio}
                    onChange={(e) => setFormData({...formData, nomeCondominio: e.target.value})}
                    placeholder="Nome do condomínio ou espaço"
                  />
                </div>
                <div>
                  <Label htmlFor="bairroFesta">Bairro da Festa</Label>
                  <Input
                    id="bairroFesta"
                    value={formData.bairroFesta}
                    onChange={(e) => setFormData({...formData, bairroFesta: e.target.value})}
                    placeholder="Preenchido automaticamente"
                    className={loadingAddress ? "animate-pulse bg-blue-50" : ""}
                  />
                  <p className="text-xs text-gray-500 mt-1">🤖 Preenchido automaticamente com base no endereço (Rio de Janeiro)</p>
                </div>
                <div>
                  <Label>Mora no Local?</Label>
                  <Select 
                    value={formData.moraNoLocal.toString()} 
                    onValueChange={(value) => setFormData({...formData, moraNoLocal: value === 'true'})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sim</SelectItem>
                      <SelectItem value="false">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!formData.moraNoLocal && (
                  <div>
                    <Label htmlFor="responsavelLocal">Quem é o Responsável?</Label>
                    <Input
                      id="responsavelLocal"
                      value={formData.responsavelLocal}
                      onChange={(e) => setFormData({...formData, responsavelLocal: e.target.value})}
                      placeholder="Nome e parentesco do responsável"
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <Label htmlFor="pontoReferencia">Ponto de Referência</Label>
                  <Input
                    id="pontoReferencia"
                    value={formData.pontoReferencia}
                    onChange={(e) => setFormData({...formData, pontoReferencia: e.target.value})}
                    placeholder="Próximo a shopping, escola, etc."
                  />
                </div>
              </div>
            </div>

            {/* Data e Horário */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                Data e Horário
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="diaSemana">Dia da Semana</Label>
                  <Select value={formData.diaSemana} onValueChange={(value) => setFormData({...formData, diaSemana: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAS_SEMANA.map((dia) => (
                        <SelectItem key={dia} value={dia}>{dia}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="inicioFesta">Início da Festa</Label>
                  <Input
                    id="inicioFesta"
                    type="time"
                    value={formData.inicioFesta}
                    onChange={(e) => setFormData({...formData, inicioFesta: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="finalFesta">Final da Festa</Label>
                  <Input
                    id="finalFesta"
                    type="time"
                    value={formData.finalFesta}
                    onChange={(e) => setFormData({...formData, finalFesta: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Marketing */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="w-5 h-5 mr-2 text-green-500" />
                Marketing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="comoConheceu">Como Conheceu a Pipocando</Label>
                  <Select value={formData.comoConheceu} onValueChange={(value) => setFormData({...formData, comoConheceu: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMO_CONHECEU_OPCOES.map((opcao) => (
                        <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                    placeholder="@usuario"
                  />
                </div>
              </div>
            </div>

            {/* Aniversariante */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-yellow-500" />
                Aniversariante
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="nomeAniversariante">Nome do Aniversariante</Label>
                  <Input
                    id="nomeAniversariante"
                    value={formData.nomeAniversariante}
                    onChange={(e) => setFormData({...formData, nomeAniversariante: e.target.value})}
                    placeholder="Nome da criança"
                  />
                </div>
                <div>
                  <Label htmlFor="idadeAniversariante">Idade do Aniversariante</Label>
                  <Input
                    id="idadeAniversariante"
                    type="number"
                    value={formData.idadeAniversariante}
                    onChange={(e) => setFormData({...formData, idadeAniversariante: parseInt(e.target.value) || 0})}
                    min="0"
                    max="18"
                  />
                </div>
                <div>
                  <Label htmlFor="temaFesta">Tema da Festa</Label>
                  <Input
                    id="temaFesta"
                    value={formData.temaFesta}
                    onChange={(e) => setFormData({...formData, temaFesta: e.target.value})}
                    placeholder="Princesas, Super-heróis, etc."
                  />
                </div>
              </div>
            </div>

            {/* Tipo de Serviço/Pacote */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-orange-500" />
                Tipo de Serviço/Pacote
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="descricaoCompletaPacote">Descrição do Pacote - Itens Inclusos no Pacote</Label>
                  <Textarea
                    id="descricaoCompletaPacote"
                    value={formData.descricaoCompletaPacote}
                    onChange={(e) => setFormData({...formData, descricaoCompletaPacote: e.target.value})}
                    placeholder="Exemplo:&#10;Pacote Recreação Teen&#10;* Com 2 Recreadores Especializados&#10;* Pacote 100% voltado para brincadeiras&#10;* Recreação Interativa e Dinâmica&#10;* Competições Dinâmicas em Grupo&#10;* Brincadeiras Criativas&#10;* Competições esportivas&#10;* Brincadeiras Retrô&#10;* Piques Diversos&#10;* Brincadeiras Exclusivas Pipocando&#10;* Organização Hora do Lanche (Picnic)&#10;* Parabéns animado&#10;Esse Pacote não contém Sonorização&#10;> + BRINCADEIRAS ESPECIAIS&#10;* Campo minado&#10;* Arranca Rabo&#10;* Bombermen&#10;* Caça aos tesouros"
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Convidados */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-indigo-500" />
                Convidados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numeroCriancasPrevisto">Número de Crianças Previsto</Label>
                  <Input
                    id="numeroCriancasPrevisto"
                    type="number"
                    value={formData.numeroCriancasPrevisto}
                    onChange={(e) => setFormData({...formData, numeroCriancasPrevisto: parseInt(e.target.value) || 0})}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="idadeCriancas">Idade das Crianças</Label>
                  <Input
                    id="idadeCriancas"
                    value={formData.idadeCriancas}
                    onChange={(e) => setFormData({...formData, idadeCriancas: e.target.value})}
                    placeholder="Ex: 5-8 anos, mista, etc."
                  />
                  <div className="mt-2">
                    <Label className="text-xs text-gray-500">Sugestões:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {FAIXAS_ETARIAS.map((faixa) => (
                        <Button
                          key={faixa}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-6 px-2"
                          onClick={() => setFormData({...formData, idadeCriancas: faixa})}
                        >
                          {faixa}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="numeroConvidadosPrevisto">Total de Convidados Previsto</Label>
                  <Input
                    id="numeroConvidadosPrevisto"
                    type="number"
                    value={formData.numeroConvidadosPrevisto}
                    onChange={(e) => setFormData({...formData, numeroConvidadosPrevisto: parseInt(e.target.value) || 0})}
                    min="0"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="restricoesGeneroMusical">Restrições ao Gênero Musical</Label>
                  <Textarea
                    id="restricoesGeneroMusical"
                    value={formData.restricoesGeneroMusical}
                    onChange={(e) => setFormData({...formData, restricoesGeneroMusical: e.target.value})}
                    placeholder="Ex: Sem funk, apenas músicas infantis, etc."
                    rows={2}
                  />
                </div>
              </div>
            </div>

          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
              Salvar Contrato
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Lista de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClientes.map((cliente: Cliente) => {
          const nomeCompleto = (cliente as any).nomeCompleto || (cliente as any).nome || '';
          const numeroCelular = (cliente as any).numeroCelular || (cliente as any).telefone || '';
          const nomeAniversariante = (cliente as any).nomeAniversariante || '';
          const idadeAniversariante = (cliente as any).idadeAniversariante || 0;
          const temaFesta = (cliente as any).temaFesta || '';
          const descricaoCompletaPacote = (cliente as any).descricaoCompletaPacote || '';
          const data = (cliente as any).data || '';
          const diaSemana = (cliente as any).diaSemana || '';
          const inicioFesta = (cliente as any).inicioFesta || (cliente as any).horarioFesta || '';
          const finalFesta = (cliente as any).finalFesta || '';
          const bairroFesta = (cliente as any).bairroFesta || '';
          const numeroCriancasPrevisto = (cliente as any).numeroCriancasPrevisto || 0;
          const numeroConvidadosPrevisto = (cliente as any).numeroConvidadosPrevisto || 0;
          const comoConheceu = (cliente as any).comoConheceu || '';
          const instagram = (cliente as any).instagram || '';

          return (
            <Card key={cliente.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-pink-700">{nomeCompleto}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {cliente.email}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(cliente)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(cliente.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-green-500" />
                  <span>{numeroCelular || 'Não informado'}</span>
                </div>
                
                {nomeAniversariante && (
                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-3 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {nomeAniversariante} - {idadeAniversariante} anos
                    </h4>
                    <p className="text-sm text-yellow-700">{temaFesta}</p>
                  </div>
                )}

                {descricaoCompletaPacote && (
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-3 rounded-lg">
                    <h4 className="font-semibold text-orange-800 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Pacote Contratado
                    </h4>
                    <p className="text-xs text-orange-700 mt-1 whitespace-pre-line leading-relaxed max-h-20 overflow-y-auto">
                      {descricaoCompletaPacote.length > 150 
                        ? `${descricaoCompletaPacote.substring(0, 150)}...`
                        : descricaoCompletaPacote
                      }
                    </p>
                  </div>
                )}

                {data && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>{data} ({diaSemana})</span>
                  </div>
                )}
                
                {inicioFesta && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <span>{inicioFesta}{finalFesta ? ` - ${finalFesta}` : ''}</span>
                  </div>
                )}

                {bairroFesta && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="truncate">{bairroFesta} - RJ</span>
                  </div>
                )}

                {(numeroCriancasPrevisto > 0 || numeroConvidadosPrevisto > 0) && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="font-medium text-blue-700">Crianças</p>
                      <p className="text-blue-600">{numeroCriancasPrevisto}</p>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <p className="font-medium text-purple-700">Total</p>
                      <p className="text-purple-600">{numeroConvidadosPrevisto}</p>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  {comoConheceu && <p><strong>Como conheceu:</strong> {comoConheceu}</p>}
                  {instagram && <p><strong>Instagram:</strong> {instagram}</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredClientes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchTerm ? 'Nenhum contrato encontrado' : 'Nenhum contrato cadastrado'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ClientsModule;