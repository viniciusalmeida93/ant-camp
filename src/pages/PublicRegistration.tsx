import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicHeader } from "@/components/layout/PublicHeader"; // IMPORTED

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, MapPin, User, Trophy, Loader2, Users, QrCode, CreditCard, CheckCircle2, ChevronRight, Share2, ExternalLink, FileText, Router, LogIn, UserPlus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PublicRegistrationMember = {
  name: string;
  email: string;
  whatsapp: string;
  shirtSize: string;
  cpf: string;
  birthDate: string;
  box: string;
};

export default function PublicRegistration() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [championship, setChampionship] = useState<any>(null);
  const [linkPage, setLinkPage] = useState<any>(null);
  const [buttons, setButtons] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRegulationOpen, setIsRegulationOpen] = useState(false);
  const [organizerName, setOrganizerName] = useState("AntCamp");

  // Form State
  const [members, setMembers] = useState<PublicRegistrationMember[]>([
    { name: "", email: "", whatsapp: "", shirtSize: "M", cpf: "", birthDate: "", box: "" },
  ]);
  const [teamName, setTeamName] = useState("");

  const [boxName, setBoxName] = useState("");
  const [userRegistrations, setUserRegistrations] = useState<any[]>([]); // New state for user registrations
  const [platformFeeConfig, setPlatformFeeConfig] = useState<{ type: 'percentage' | 'fixed', value: number }>({ type: 'percentage', value: 5 }); // Default 5% fallback

  useEffect(() => {
    loadPageData();
    checkAuthAndPrefill(); // NEW CALL
  }, [slug]);

  // NEW FUNCTION: Prefill data
  const checkAuthAndPrefill = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile) {
        setMembers(prev => {
          const newMembers = [...prev];
          newMembers[0] = {
            ...newMembers[0],
            name: profile.full_name || "",
            email: session.user.email || "",
            whatsapp: profile.phone || "",
            cpf: profile.cpf || "",
            birthDate: profile.birth_date || "",
          };
          return newMembers;
        });
      }

      // 2. Fetch User Registrations for this Championship (if championship loaded)
      // We might need to call this after championship is set, or use the slug to find logic.
      // But here we rely on the effect dependency [slug].
      // To be safe, we can try to fetch based on championship_id if we have it? 
      // Actually, checkAuthAndPrefill is called in the same effect as loadPageData, but we might not have 'championship' state yet.
      // Better to do this fetch INSIDE loadPageData or after we have the ID.
      // BUT, let's try to fetch by slug roughly or just wait?
      // Re-architect: Allow checkAuthAndPrefill to verify championship context or pass it in.
      // For now, let's just leave profile loading here. I will add the registration fetch to loadPageData or a new effect.
    }
  };

  useEffect(() => {
    if (championship?.id) {
      loadUserRegistrations();
    }
  }, [championship?.id]);

  const loadUserRegistrations = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !championship?.id) return;

    const { data } = await supabase
      .from("registrations")
      .select("*")
      .eq("championship_id", championship.id)
      .eq("user_id", session.user.id);

    if (data) setUserRegistrations(data);
  };

  const loadPageData = async () => {
    try {
      // We will fetch championship directly since this is /register/:slug route which might use championship slug
      // But logic copied from LinkPage used link_page record first. 
      // For robustness, let's try to find championship by slug first, if fail, try link_page.

      let champ;

      // 1. Try fetching Championship by slug directly
      const { data: champBySlug, error: champError } = await supabase
        .from("championships")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (champBySlug) {
        champ = champBySlug;
      } else {
        // Fallback: maybe slug is link_page slug?
        const { data: page } = await supabase
          .from("link_pages")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (page) {
          const { data: champRel } = await supabase
            .from("championships")
            .select("*")
            .eq("id", page.championship_id)
            .single();
          champ = champRel;
          setLinkPage(page);
        }
      }

      if (!champ) throw new Error("Campeonato não encontrado");
      if (!champ) throw new Error("Campeonato não encontrado");
      setChampionship(champ);

      // Fetch Platform Fee Config
      let finalFeeConfig = { type: 'fixed', value: 900 }; // Default base fallback

      // 1. Fetch Global Setting (Main Source of Truth)
      const { data: feeData } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'platform_fee_config')
        .maybeSingle();

      if (feeData?.value) {
        try {
          finalFeeConfig = JSON.parse(feeData.value);
          console.log("DEBUG: Usando taxa global da plataforma:", finalFeeConfig);
        } catch (e) {
          console.error("Error parsing global fee config", e);
        }
      }

      // 2. Check Championship Override (Only if specifically configured for this champ)
      if (champ.platform_fee_configuration && typeof champ.platform_fee_configuration === 'object' && Object.keys(champ.platform_fee_configuration).length > 0) {
        console.log("DEBUG: Usando override de taxa do campeonato:", champ.platform_fee_configuration);
        finalFeeConfig = champ.platform_fee_configuration;
      }

      setPlatformFeeConfig(finalFeeConfig as any);

      if (champ.organizer_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", champ.organizer_id)
          .maybeSingle();
        if (profile && profile.full_name) setOrganizerName(profile.full_name);
      }

      // Fetch Buttons just in case we want to show them? For registration page, maybe not needed prominently?
      // But user liked the design including buttons area. Let's keep it but maybe minimize navigation away.
      // Actually, let's fetch link page connected to this championship to get buttons if any
      if (!linkPage) {
        const { data: lp } = await supabase.from('link_pages').select('*').eq('championship_id', champ.id).maybeSingle();
        if (lp) setLinkPage(lp);
      }

      // 4. Fetch Categories
      const { data: cats, error: catsError } = await supabase
        .from("categories")
        .select("*")
        .eq("championship_id", champ.id)
        .order("order_index", { ascending: true, nullsFirst: true });

      if (catsError) throw catsError;
      setCategories(cats);

      // 5. Fetch Registrations for Batch Calculation
      const { data: regs, error: regsError } = await supabase
        .from("registrations")
        .select("id, created_at, category_id, status")
        .eq("championship_id", champ.id)
        .in("status", ["approved", "pending", "waiting_payment"]); // Consider slots taken for these statuses

      if (regsError) throw regsError;
      setAllRegistrations(regs || []);

    } catch (error: any) {
      console.error("Error loading page data:", error);
      toast.error("Erro ao carregar dados da página");
    } finally {
      setLoading(false);
    }
  };

  const getActiveBatch = (category: any) => {
    if (!category.has_batches || !category.batches || category.batches.length === 0) return null;

    // Filter registrations for this category
    const categoryRegistrations = allRegistrations
      .filter(r => r.category_id === category.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let currentBatchIndex = 0;
    let currentBatchfilledCount = 0;

    // Simulate assignments for existing registrations
    for (const reg of categoryRegistrations) {
      if (currentBatchIndex >= category.batches.length) break; // No more batches

      let batch = category.batches[currentBatchIndex];
      const regDate = new Date(reg.created_at);

      // Check if batch expired by date relative to registration time
      // Logic: If registration happened after batch end_date, this batch should have been expired
      if (batch.end_date && regDate > new Date(batch.end_date + 'T23:59:59')) {
        currentBatchIndex++;
        currentBatchfilledCount = 0;
        if (currentBatchIndex >= category.batches.length) break;
        batch = category.batches[currentBatchIndex];
      }

      // Check if batch full
      if (batch.quantity && currentBatchfilledCount >= batch.quantity) {
        currentBatchIndex++;
        currentBatchfilledCount = 0;
      }

      // Assign to current (or new current)
      if (currentBatchIndex < category.batches.length) {
        currentBatchfilledCount++;
      }
    }

    // Now check availability for the NEW user (Now)
    if (currentBatchIndex >= category.batches.length) return null; // Sold out

    let activeBatch = category.batches[currentBatchIndex];
    const now = new Date();

    // Check if current batch is expired by date RIGHT NOW
    if (activeBatch.end_date && now > new Date(activeBatch.end_date + 'T23:59:59')) {
      currentBatchIndex++;
      currentBatchfilledCount = 0;
    }
    // Check if current batch is full RIGHT NOW (should be caught by loop, but double check equality)
    else if (activeBatch.quantity && currentBatchfilledCount >= activeBatch.quantity) {
      currentBatchIndex++;
      currentBatchfilledCount = 0;
    }

    if (currentBatchIndex >= category.batches.length) return null; // Sold out

    return category.batches[currentBatchIndex];
  };

  const computeCategoryPrice = (category: any) => {
    const activeBatch = getActiveBatch(category);
    return activeBatch ? activeBatch.price_cents : category.price_cents;
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  };
  // Kept for consistency if we decide to show navigation buttons
  const handleButtonClick = (buttonType: string) => {
    const cacheBust = `?v=${Date.now()}`;
    const champSlug = championship?.slug;
    if (!champSlug) return;

    if (buttonType === "leaderboard") window.open(`/${champSlug}/leaderboard${cacheBust}`, "_blank");
    else if (buttonType === "heats") window.open(`/${champSlug}/heats${cacheBust}`, "_blank");
    else if (buttonType === "wods") window.open(`/${champSlug}/wods${cacheBust}`, "_blank");
  };

  // Wizard State
  const [currentStep, setCurrentStep] = useState(1); // 1: Auth, 2: Registration, 3: Payment
  const [authTab, setAuthTab] = useState("login");
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  // Payment states
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved'>('pending');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');

  // Credit Card State
  const [cardData, setCardData] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    cpfCnpj: '', // New field for holder CPF
    postalCode: '',
    addressNumber: '',
    phone: ''
  });

  // Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Signup specific
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        // Obter email da sessão se não estiver no profile (geralmente não está)
        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email || "";

        setMembers(prev => {
          const newMembers = [...prev];
          if (newMembers.length > 0) {
            newMembers[0] = {
              ...newMembers[0],
              name: profile.full_name || "",
              email: userEmail,
              cpf: profile.cpf || "",
              whatsapp: profile.phone || "",
              birthDate: profile.birth_date || "",
              box: profile.box || ""
            };
          }
          return newMembers;
        });
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  };

  const calculateAge = (birthDateString: string) => {
    if (!birthDateString) return 0;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const checkAgeEligibility = (memberAge: number, category: any) => {
    // Logic: 
    // If min_age exists, age must be >= min_age
    // If max_age exists, age must be <= max_age
    // If both exist, must be within range
    // If neither, always allowed

    if (category.min_age && memberAge < category.min_age) return false;
    if (category.max_age && memberAge > category.max_age) return false;
    return true;
  };

  const handleRegistrationStart = async () => {
    if (!selectedCategory) { toast.error("Selecione uma categoria para se inscrever."); return; }

    // Check session to determine start step
    const { data: { session } } = await supabase.auth.getSession();

    // Initialize with empty
    const teamSize = computeTeamSize(selectedCategory);
    let initialMembers = Array(teamSize).fill(null).map(() => ({ name: "", email: "", whatsapp: "", shirtSize: "M", cpf: "", birthDate: "", box: "" }));
    setMembers(initialMembers);

    if (session) {
      // Validate Age if profile loaded
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile && profile.birth_date) {
        if (selectedCategory.format === 'individual') {
          const age = calculateAge(profile.birth_date);
          if (!checkAgeEligibility(age, selectedCategory)) {
            toast.error(`Sua idade (${age} anos) não é compatível com esta categoria (${selectedCategory.min_age ? 'Mín: ' + selectedCategory.min_age : ''}${selectedCategory.max_age ? ' Máx: ' + selectedCategory.max_age : ''}).`);
            return;
          }
        }
        // Load profile into form
        initialMembers[0] = {
          ...initialMembers[0],
          name: profile.full_name || "",
          email: session.user.email || "",
          whatsapp: profile.phone || "",
          cpf: profile.cpf || "",
          birthDate: profile.birth_date || "",
          box: profile.box || ""
        };
        setMembers(initialMembers);
      }

      setCurrentStep(2); // Skip auth
      setIsFormOpen(true);
    } else {
      setCurrentStep(1); // Start with auth
      setIsFormOpen(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Login realizado com sucesso!");

      if (data.user) {
        // Age check on login
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
        if (profile && profile.birth_date && selectedCategory?.format === 'individual') {
          const age = calculateAge(profile.birth_date);
          if (!checkAgeEligibility(age, selectedCategory)) {
            toast.error(`Sua idade (${age} anos) não é compatível com esta categoria.`);
            // Don't block login, but maybe block proceeding? 
            // For now, let's just warn and let them proceed to see the error in form if they try to save.
            // Actually, better to block the STEP transition if invalid.
            // But handleLogin is inside the form wizard.
            // Let's check here.
            setAuthLoading(false);
            return; // Stop here if invalid? Or allow them to change category?
            // If we stop, they are logged in but stuck on step 1.
            // Let's allow step 2 but they will see their data populated and hopefully realize.
            // Actually user asked to system "saber por ai", so blocking is better.
            // But they might want to register a Team where they are the captain but not the athlete? 
            // "Nome do Time/Pessoa" implies athlete.
            // If individual, the user IS the athlete.
          }
        }
        await loadUserProfile(data.user.id);
      }

      setCurrentStep(2);
    } catch (error: any) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos." : error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    if (password.length < 6) { toast.error("Senha muito curta (mínimo 6 caracteres)"); return; }
    if (!birthDate) { toast.error("Data de nascimento obrigatória"); return; }

    // Age validation for signup before creating account?
    if (selectedCategory?.format === 'individual') {
      const age = calculateAge(birthDate);
      if (!checkAgeEligibility(age, selectedCategory)) {
        toast.error(`Sua idade (${age} anos) não é compatível com esta categoria.`);
        return;
      }
    }

    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, cpf, phone, birth_date: birthDate } }
      });
      if (error) throw error;

      // Update profile with retry mechanism to handle race condition with DB trigger
      if (data.user) {
        const waitForProfile = async (userId: string, attempts = 5) => {
          for (let i = 0; i < attempts; i++) {
            const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
            if (profile) return true;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
          }
          return false;
        };

        const profileExists = await waitForProfile(data.user.id);
        if (profileExists) {
          await supabase.from('profiles').update({ full_name: fullName, cpf, phone, birth_date: birthDate }).eq('id', data.user.id);
          // Load data into form after updating profile
          await loadUserProfile(data.user.id);
        } else {
          console.error("Profile creation timed out, could not save extra details.");
        }
      }

      toast.success("Conta criada! Você já pode prosseguir.");
      setCurrentStep(2);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const computeTeamSize = (category: any) => {
    if (!category) return 1;
    if (category.team_size && category.team_size > 0) return category.team_size;
    const format = category.format?.toLowerCase() || '';
    if (format.includes('dupla') || format.includes('duo')) return 2;
    if (format.includes('trio')) return 3;
    if (format.includes('time') || format.includes('team')) return 4;
    return 1;
  };

  const updateMember = (index: number, field: keyof PublicRegistrationMember, value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    if (selectedCategory.format !== 'individual' && !teamName) { toast.error("Nome do time é obrigatório"); return; }
    if (!boxName) { toast.error("Box para Chamada é obrigatório"); return; }
    for (const m of members) { if (!m.name || !m.email || !m.cpf) { toast.error("Preencha todos os campos obrigatórios dos integrantes"); return; } }


    setSubmitting(true);
    try {
      const subtotalCents = computeCategoryPrice(selectedCategory);

      let platformFeeCents = 0;
      if (platformFeeConfig.type === 'percentage') {
        platformFeeCents = Math.round(subtotalCents * (platformFeeConfig.value / 100));
      } else {
        platformFeeCents = Math.round(platformFeeConfig.value); // Value already in cents? No, value in settings is usually R$ or % number. 
        // Wait, in SuperAdminFees we store value as number. If fixed, is it cents or reals?
        // In SuperAdminFees input type=number step=0.01 implies Reals. 
        // Let's assume the stored value for fixed is in CENTS or Reals? 
        // Looking at SuperAdminFees: 
        // value={feeConfig.type === 'percentage' ? feeConfig.value : feeConfig.value / 100}
        // This implies for FIXED, the state `feeConfig.value` is in CENTS.
        // So here `platformFeeConfig.value` should be in CENTS.
        platformFeeCents = platformFeeConfig.value;
      }

      const totalCents = subtotalCents + platformFeeCents;
      const athleteName = selectedCategory.format === "individual" ? members[0].name : teamName;
      const athleteEmail = members[0].email;

      const registrationData: any = {
        championship_id: championship.id,
        category_id: selectedCategory.id,
        athlete_name: athleteName,
        athlete_email: athleteEmail,
        athlete_phone: members[0].whatsapp,
        team_name: selectedCategory.format !== "individual" ? teamName : null,
        box_name: boxName,
        subtotal_cents: subtotalCents,
        platform_fee_cents: platformFeeCents,
        total_cents: totalCents,
        status: "pending",
        payment_status: "pending",
        team_members: members.map(m => ({ ...m, cpf: m.cpf.replace(/\D/g, "") })),
      };

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) registrationData.user_id = session.user.id;

      const { data: registration, error } = await supabase.from("registrations").insert(registrationData).select().single();
      if (error) throw error;

      setRegistrationId(registration.id);
      toast.success("Inscrição pré-realizada! Redirecionando para o pagamento...");
      navigate(`/checkout/${registration.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar inscrição: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!championship) return <div className="min-h-screen bg-background text-center pt-20 text-muted-foreground">Campeonato não encontrado.</div>;

  // Render Wizard View
  if (isFormOpen) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <PublicHeader /> {/* Header Added */}


        <div className="flex-1 w-full mx-auto px-6 py-8 max-w-[800px] pb-32">
          <div className="mb-8 text-center">
            {currentStep === 1 && (
              <>
                <h2 className="text-2xl font-bold mb-2">Identificação</h2>
                <p className="text-muted-foreground">Faça login ou crie sua conta para continuar.</p>
              </>
            )}
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between px-4 md:px-12 py-2 mb-8">
            <div className={cn("flex flex-col items-center gap-2", currentStep >= 1 ? "text-primary" : "text-muted-foreground")}>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors", currentStep >= 1 ? "border-primary bg-primary/10" : "border-muted")}>1</div>
              <span className="text-[10px] md:text-xs font-medium uppercase tracking-wider">Identificação</span>
            </div>
            <div className={cn("flex-1 h-0.5 mx-4 transition-colors", currentStep >= 2 ? "bg-primary" : "bg-muted")} />
            <div className={cn("flex flex-col items-center gap-2", currentStep >= 2 ? "text-primary" : "text-muted-foreground")}>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors", currentStep >= 2 ? "border-primary bg-primary/10" : "border-muted")}>2</div>
              <span className="text-[10px] md:text-xs font-medium uppercase tracking-wider">Inscrição</span>
            </div>

            <div className="flex-1 h-0.5 mx-4 transition-colors bg-muted" />
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 border-muted">3</div>
              <span className="text-[10px] md:text-xs font-medium uppercase tracking-wider">Pagamento</span>
            </div>
          </div>



          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-6">
              {/* Step 1: Auth */}
              {currentStep === 1 && (
                <Tabs value={authTab} onValueChange={setAuthTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login">Já tenho conta</TabsTrigger>
                    <TabsTrigger value="signup">Criar nova conta</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Senha</Label>
                        <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full h-11 mt-2" disabled={authLoading}>
                        {authLoading ? <Loader2 className="animate-spin mr-2" /> : "Entrar e Continuar"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignup} className="space-y-4 max-w-md mx-auto">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Nome Completo</Label>
                        <Input id="signup-name" value={fullName} onChange={e => setFullName(e.target.value)} required />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="signup-cpf">CPF</Label>
                          <Input id="signup-cpf" value={cpf} onChange={e => setCpf(e.target.value)} required placeholder="000.000.000-00" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-phone">Celular</Label>
                          <Input id="signup-phone" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="(11) 99999-9999" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-birth">Data de Nascimento</Label>
                        <Input id="signup-birth" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="signup-pass">Senha</Label>
                          <Input id="signup-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-confirm">Confirme</Label>
                          <Input id="signup-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-11 mt-2" disabled={authLoading}>
                        {authLoading ? <Loader2 className="animate-spin mr-2" /> : "Criar Conta e Continuar"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}

              {/* Step 2: Form */}
              {currentStep === 2 && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Existing Form Content - Keeping as is but wrapping in step check */}
                  {selectedCategory?.format !== 'individual' && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label>Nome do Time/Pessoa *</Label>
                        <Input
                          value={teamName}
                          onChange={e => setTeamName(e.target.value)}
                          placeholder="Ex: Time RX"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label>Box para Chamada *</Label>
                    <Input
                      value={boxName}
                      onChange={e => setBoxName(e.target.value)}
                      placeholder="Ex: CrossFit SP (Nome do Box Principal)"
                    />
                  </div>

                  {members.map((member, idx) => (
                    <div key={idx} className="space-y-4 pt-6 border-t border-border first:border-0 first:pt-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-sm">
                          {selectedCategory?.format === 'individual' ? 'Dados do Atleta' : `Integrante ${idx + 1}`}
                        </p>
                      </div>

                      <div className="grid gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Nome Completo</Label>
                          <Input
                            placeholder="Nome completo (opcional)"
                            value={member.name}
                            onChange={e => updateMember(idx, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Email</Label>
                          <Input
                            placeholder="email@exemplo.com (opcional)"
                            type="email"
                            value={member.email}
                            onChange={e => updateMember(idx, 'email', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">CPF</Label>
                          <Input
                            placeholder="000.000.000-00 (opcional)"
                            value={member.cpf}
                            onChange={e => updateMember(idx, 'cpf', e.target.value)}
                            maxLength={14}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">WhatsApp</Label>
                          <Input
                            placeholder="(11) 99999-9999 (opcional)"
                            value={member.whatsapp}
                            onChange={e => updateMember(idx, 'whatsapp', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Data de Nascimento</Label>
                          <Input
                            type="date"
                            value={member.birthDate}
                            onChange={e => updateMember(idx, 'birthDate', e.target.value)}
                            className="block w-full"
                            placeholder="dd/mm/aaaa"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Tamanho da Camisa</Label>
                          <Select value={member.shirtSize} onValueChange={v => updateMember(idx, 'shirtSize', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Camisa" />
                            </SelectTrigger>
                            <SelectContent>
                              {['PP', 'P', 'M', 'G', 'GG', 'XG'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground mb-1 block">Box do Atleta</Label>
                        <Input
                          placeholder="Box onde treina (opcional)"
                          value={member.box}
                          onChange={e => updateMember(idx, 'box', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}

                  <Button type="submit" className="w-full h-12 text-lg font-bold mt-4" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin mr-2" /> : "Ir para Pagamento"}
                  </Button>
                </form>
              )}

              {/* Removed Step 3: Payment */}
            </CardContent>
          </Card>
        </div>
      </div >
    );
  }

  // Render Landing Page View
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* 1. Navbar / Header */}
      <PublicHeader />

      <div className="w-full mx-auto px-6 py-8 max-w-[600px] pb-32">
        {/* 2. Banner/Logo Area */}
        <div className="rounded-lg overflow-hidden mb-8 aspect-video relative flex items-center justify-center">
          {(linkPage?.banner_url || championship.banner_url) ? (
            <img
              src={linkPage?.banner_url || championship.banner_url}
              alt={linkPage?.banner_alt || championship.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6">
              <h1 className="text-2xl font-bold text-foreground mb-3">{championship.name}</h1>
              <Badge variant="outline" className="text-primary border-primary/50 bg-primary/10">Inscrições Abertas</Badge>
            </div>
          )}
        </div>

        {/* 4. Info Card */}

        <Card className="mb-8 border-0 bg-card shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Data</span>
              </div>
              <span className="font-medium text-foreground text-xs">{new Date(championship.date).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Local</span>
              </div>
              <span className="font-medium text-foreground text-right max-w-[60%] truncate uppercase text-xs">{championship.location}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Organizador</span>
              </div>
              <span className="font-medium text-foreground text-xs">{organizerName}</span>
            </div>
          </CardContent>
        </Card>

        {/* 5. About Section */}
        <div className="mb-8">
          <h3 className="text-muted-foreground text-sm font-medium mb-3 px-1">Detalhes do Evento</h3>
          <Card className="border-0 bg-card shadow-lg">
            <CardContent className="p-6 text-sm text-foreground/80 leading-relaxed">
              {championship.description || "Sem descrição disponível."}
            </CardContent>
          </Card>
          <div className="flex justify-start mt-4">
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-muted-foreground hover:text-primary gap-2 h-8 px-3 rounded-full bg-background border-border"
              onClick={() => setIsRegulationOpen(true)}
            >
              <FileText className="w-3.5 h-3.5" />
              Ver Regulamento
            </Button>
          </div>
        </div>

        {/* Regulation Modal */}
        <Dialog open={isRegulationOpen} onOpenChange={setIsRegulationOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>Regulamento do Campeonato</DialogTitle>
              <DialogDescription>
                Leia atentamente as regras e diretrizes do evento.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden p-6 pt-2">
              <ScrollArea className="h-full pr-4">
                <div className="text-sm text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
                  {championship.regulation ? championship.regulation : "Regulamento não disponível."}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        {/* 6. Registration Section */}
        <div id="registration-section">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground">Inscrições</h2>
            <p className="text-sm text-muted-foreground">Selecione sua categoria abaixo</p>
          </div>

          <div className="space-y-4">
            {categories.map((cat) => {
              const activeBatch = getActiveBatch(cat);
              const price = computeCategoryPrice(cat);
              const isSelected = selectedCategory?.id === cat.id;
              const isRegistered = userRegistrations.some(r => r.category_id === cat.id);

              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "relative overflow-hidden rounded-lg border transition-all cursor-pointer group",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="p-5 flex items-center gap-4">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                    )}>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {activeBatch && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-2 h-5">
                            {activeBatch.name}
                          </Badge>
                        )}
                        {isRegistered && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 text-[10px] px-2 h-5">
                            Inscrito
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          {cat.gender} • {cat.format}
                          {cat.min_age && cat.max_age ? ` • ${cat.min_age}-${cat.max_age} ANOS` :
                            cat.min_age ? ` • ${cat.min_age}+ ANOS` :
                              cat.max_age ? ` • ATÉ ${cat.max_age} ANOS` : ''}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground truncate pr-2">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        + Taxa de serviço ({formatPrice(
                          (platformFeeConfig.type === 'percentage'
                            ? Math.round(price * (platformFeeConfig.value / 100))
                            : platformFeeConfig.value) + 199
                        )})
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-xs text-muted-foreground mb-0.5">Total</span>
                      <span className="block text-lg font-bold text-foreground leading-none">
                        {formatPrice(price)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border z-20">
        <div className="max-w-[600px] mx-auto w-full">
          <Button
            onClick={() => {
              const isRegistered = userRegistrations.some(r => r.category_id === selectedCategory?.id);
              if (isRegistered) {
                navigate('/athlete-dashboard');
              } else {
                handleRegistrationStart();
              }
            }}
            disabled={!selectedCategory}
            className={cn(
              "w-full h-12 text-lg font-bold shadow-lg transition-all",
              !selectedCategory && "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {userRegistrations.some(r => r.category_id === selectedCategory?.id) ? (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Ver Detalhes da Inscrição
              </>
            ) : (
              "Fazer Inscrição"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}