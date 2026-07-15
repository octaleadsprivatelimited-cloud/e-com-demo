"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Eye, 
  Download, 
  Share2, 
  Save, 
  Check, 
  Smartphone, 
  Tablet, 
  Monitor, 
  FileText, 
  Palette, 
  Copy,
  ExternalLink,
  Info,
  UploadCloud,
  Image as ImageIcon,
  Languages,
  X as XIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";

// Supported languages list
const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिंदी" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "od", name: "Odia", nativeName: "ଓଡ଼ିଆ" }
];

// YouTube video link parser using youtube-nocookie.com
const getYoutubeEmbedUrl = (url: string, autoplay: boolean) => {
  if (!url) return "";
  let videoId = "";
  try {
    const cleaned = url.trim();
    // Check if it's a direct 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
      videoId = cleaned;
    } else {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = cleaned.match(regExp);
      if (match && match[2].length === 11) {
        videoId = match[2];
      } else {
        // Fallback url parsing
        const urlObj = new URL(cleaned);
        if (urlObj.hostname.includes("youtube.com")) {
          if (urlObj.pathname.startsWith("/shorts/")) {
            videoId = urlObj.pathname.split("/")[2];
          } else {
            videoId = urlObj.searchParams.get("v") || "";
          }
        } else if (urlObj.hostname.includes("youtu.be")) {
          videoId = urlObj.pathname.substring(1);
        }
      }
    }
  } catch (e) {
    // If URL parsing fails, extract whatever matches an 11-char format
    const match = url.match(/[a-zA-Z0-9_-]{11}/);
    if (match) videoId = match[0];
  }

  if (!videoId) return "";
  // Always start muted when autoplay is on (browser policy requires it)
  // The iframe onLoad handler will unmute via postMessage after playback begins
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&mute=${autoplay ? 1 : 0}&enablejsapi=1&rel=0&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
};

// Region auto-detection logic
const getAutoDetectedLanguage = (region: string) => {
  if (!region) return "en";
  const r = region.toLowerCase();
  // Marathi — Maharashtra
  if (r.includes("pune") || r.includes("mumbai") || r.includes("nagpur") || r.includes("maharashtra") || r.includes("sadashiv") || r.includes("thane") || r.includes("nashik") || r.includes("aurangabad") || r.includes("kolhapur") || r.includes("solapur")) {
    return "mr";
  }
  // Telugu — Telangana & Andhra Pradesh
  if (r.includes("hyderabad") || r.includes("telangana") || r.includes("andhra") || r.includes("tirupati") || r.includes("vijayawada") || r.includes("visakhapatnam")) {
    return "te";
  }
  // Kannada — Karnataka
  if (r.includes("bangalore") || r.includes("bengaluru") || r.includes("karnataka") || r.includes("mysore") || r.includes("hubli") || r.includes("mangalore")) {
    return "kn";
  }
  // Tamil — Tamil Nadu
  if (r.includes("chennai") || r.includes("tamil") || r.includes("madurai") || r.includes("coimbatore") || r.includes("salem") || r.includes("trichy")) {
    return "ta";
  }
  // Bengali — West Bengal
  if (r.includes("kolkata") || r.includes("bengal") || r.includes("howrah") || r.includes("siliguri") || r.includes("durgapur")) {
    return "bn";
  }
  // Gujarati — Gujarat
  if (r.includes("ahmedabad") || r.includes("gujarat") || r.includes("surat") || r.includes("vadodara") || r.includes("rajkot")) {
    return "gu";
  }
  // Malayalam — Kerala
  if (r.includes("kerala") || r.includes("kochi") || r.includes("trivandrum") || r.includes("thiruvananthapuram") || r.includes("kozhikode") || r.includes("calicut")) {
    return "ml";
  }
  // Punjabi — Punjab
  if (r.includes("punjab") || r.includes("amritsar") || r.includes("ludhiana") || r.includes("chandigarh") || r.includes("jalandhar") || r.includes("patiala")) {
    return "pa";
  }
  // Odia — Odisha
  if (r.includes("odisha") || r.includes("orissa") || r.includes("bhubaneswar") || r.includes("cuttack") || r.includes("puri")) {
    return "od";
  }
  // Hindi — North/Central India
  if (r.includes("delhi") || r.includes("patna") || r.includes("up") || r.includes("mp") || r.includes("bihar") || r.includes("lucknow") || r.includes("jaipur") || r.includes("rajasthan") || r.includes("bhopal") || r.includes("varanasi")) {
    return "hi";
  }
  return "en";
};

// Manifesto Template design presets
const TEMPLATE_PRESETS = [
  {
    id: "navy",
    name: "Classic Navy",
    primaryColor: "#0F2027",
    secondaryColor: "#203A43",
    accentColor: "#2C5364",
    textColor: "#FFFFFF",
    bgClass: "bg-slate-900",
    textClass: "text-slate-100",
    borderClass: "border-slate-800",
    badgeClass: "bg-slate-800 text-slate-300"
  },
  {
    id: "teal",
    name: "Progressive Teal",
    primaryColor: "#0d9488",
    secondaryColor: "#0f766e",
    accentColor: "#14b8a6",
    textColor: "#FFFFFF",
    bgClass: "bg-teal-950",
    textClass: "text-teal-50",
    borderClass: "border-teal-900",
    badgeClass: "bg-teal-900/50 text-teal-300"
  },
  {
    id: "saffron",
    name: "Vibrant Saffron",
    primaryColor: "#ea580c",
    secondaryColor: "#c2410c",
    accentColor: "#f97316",
    textColor: "#FFFFFF",
    bgClass: "bg-orange-950",
    textClass: "text-orange-50",
    borderClass: "border-orange-900",
    badgeClass: "bg-orange-900/50 text-orange-300"
  }
];

export default function CampaignPageBuilder() {
  const [candidate, setCandidate] = useState<any>(null);
  
  // Multi-Language Management States
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [activeEditingLang, setActiveEditingLang] = useState("en");
  
  // Customization States per language
  const [headlines, setHeadlines] = useState<Record<string, string>>({
    en: "Empowering Our Community with Integrity",
    hi: "सत्यनिष्ठा के साथ हमारे समुदाय को सशक्त बनाना",
    mr: "सत्यनिष्ठेसह आपल्या समुदायाचे सक्षमीकरण करणे",
    te: "సమగ్రతతో మన సమాజాన్ని బలోపేతం చేయడం",
    kn: "ಸಮಗ್ರತೆಯೊಂದಿಗೆ ನಮ್ಮ ಸಮುದಾಯವನ್ನು ಸಬಲೀಕರಣಗೊಳಿಸುವುದು",
    ta: "நேர்மையுடன் நமது சமூகத்தை வலுப்படுத்துதல்",
    bn: "সততার সাথে আমাদের সম্প্রদায়কে ক্ষমতায়ন করা",
    gu: "પ્રામાણિકતા સાથે આપણા સમુદાયને સશક્ત બનાવવું",
    ml: "സത്യസന്ധതയോടെ നമ്മുടെ സമൂഹത്തെ ശാക്തീകരിക്കുക",
    pa: "ਇਮਾਨਦਾਰੀ ਨਾਲ ਸਾਡੇ ਭਾਈਚਾਰੇ ਨੂੰ ਸਸ਼ਕਤ ਬਣਾਉਣਾ",
    od: "ସତ୍ୟନିଷ୍ଠା ସହ ଆମ ସମୁଦାୟକୁ ସଶକ୍ତ କରିବା"
  });

  const [bios, setBios] = useState<Record<string, string>>({
    en: "Dedicated to transparent development, local safety improvements, cleaner streets, and reliable utility infrastructure.",
    hi: "पारदर्शी विकास, स्थानीय सुरक्षा सुधार, स्वच्छ सड़कों और विश्वसनीय उपयोगिता बुनियादी ढांचे के लिए समर्पित।",
    mr: "पारदर्शक विकास, स्थानिक सुरक्षिततेत सुधारणा, स्वच्छ रस्ते आणि विश्वासार्ह पायाभूत सुविधांसाठी समर्पित.",
    te: "పారదర్శక అభివృద్ధి, స్థానిక భద్రతా మెరుగుదలలు, పరిశుభ్రమైన వీధులు మరియు నమ్మకమైన మౌలిక సదుపాయాలకు అంకితం.",
    kn: "ಪಾರದರ್ಶಕ ಅಭಿವೃದ್ಧಿ, ಸ್ಥಳೀಯ ಸುರಕ್ಷತೆ ಸುಧಾರಣೆ, ಸ್ವಚ್ಛ ರಸ್ತೆಗಳು ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹ ಮೂಲಸೌಕರ್ಯಕ್ಕೆ ಸಮರ್ಪಿತ.",
    ta: "வெளிப்படையான வளர்ச்சி, உள்ளூர் பாதுகாப்பு மேம்பாடுகள், தூய்மையான தெருக்கள் மற்றும் நம்பகமான உள்கட்டமைப்புக்கு அர்ப்பணிப்பு.",
    bn: "স্বচ্ছ উন্নয়ন, স্থানীয় নিরাপত্তা উন্নতি, পরিচ্ছন্ন রাস্তা এবং নির্ভরযোগ্য অবকাঠামোর জন্য নিবেদিত।",
    gu: "પારદર્શક વિકાસ, સ્થાનિક સુરક્ષા સુધારણા, સ્વચ્છ શેરીઓ અને વિશ્વસનીય માળખાકીય સુવિધાઓ માટે સમર્પિત.",
    ml: "സുതാര്യ വികസനം, പ്രാദേശിക സുരക്ഷാ മെച്ചപ്പെടുത്തലുകൾ, വൃത്തിയുള്ള തെരുവുകൾ, വിശ്വസനീയ അടിസ്ഥാന സൗകര്യങ്ങൾ എന്നിവയ്ക്കായി സമർപ്പിതം.",
    pa: "ਪਾਰਦਰਸ਼ੀ ਵਿਕਾਸ, ਸਥਾਨਕ ਸੁਰੱਖਿਆ ਸੁਧਾਰ, ਸਾਫ਼ ਸੜਕਾਂ ਅਤੇ ਭਰੋਸੇਯੋਗ ਬੁਨਿਆਦੀ ਢਾਂਚੇ ਲਈ ਸਮਰਪਿਤ।",
    od: "ସ୍ୱଚ୍ଛ ବିକାଶ, ସ୍ଥାନୀୟ ସୁରକ୍ଷା ଉନ୍ନତି, ପରିଷ୍କାର ରାସ୍ତା ଏବଂ ନିର୍ଭରଯୋଗ୍ୟ ଭିତ୍ତିଭୂମି ପାଇଁ ସମର୍ପିତ।"
  });

  const [bannerUrl, setBannerUrl] = useState("https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80");
  const [symbolUrl, setSymbolUrl] = useState("https://images.unsplash.com/photo-1590073844006-33379778ae09?w=300&auto=format&fit=crop&q=80");
  
  // Manifesto Builder States per language
  const [manifestoTitles, setManifestoTitles] = useState<Record<string, string>>({
    en: "Sadashiv Peth Development Blueprint",
    hi: "सदाशिव पेठ विकास खाका",
    mr: "सदाशिव पेठ विकास आराखडा",
    te: "సదాశివ్ పేట్ అభివృద్ధి బ్లూప్రింట్",
    kn: "ಸದಾಶಿವ ಪೇಠ ಅಭಿವೃದ್ಧಿ ನೀಲನಕ್ಷೆ",
    ta: "சதாசிவ பேட் வளர்ச்சி திட்டம்",
    bn: "সদাশিব পেঠ উন্নয়ন ব্লুপ্রিন্ট",
    gu: "સદાશિવ પેઠ વિકાસ બ્લૂપ્રિન્ટ",
    ml: "സദാശിവ് പേഠ് വികസന ബ്ലൂപ്രിന്റ്",
    pa: "ਸਦਾਸ਼ਿਵ ਪੇਠ ਵਿਕਾਸ ਬਲੂਪ੍ਰਿੰਟ",
    od: "ସଦାଶିବ ପେଠ ବିକାଶ ବ୍ଲୁପ୍ରିଣ୍ଟ"
  });

  const [selectedTemplate, setSelectedTemplate] = useState("navy");
  
  // Custom theme colors designed by user/customer
  const [customPrimaryColor, setCustomPrimaryColor] = useState("#0f172a");
  const [customAccentColor, setCustomAccentColor] = useState("#3b82f6");
  const [customTextColor, setCustomTextColor] = useState("#ffffff");
  const [customBorderColor, setCustomBorderColor] = useState("#1e293b");
  
  const [promisesByLang, setPromisesByLang] = useState<Record<string, string[]>>({
    en: [
      "24/7 Clean Drinking Water supply for all residential blocks.",
      "Installation of 150+ eco-friendly solar street lights.",
      "Establishing a weekly direct-to-voter feedback portal."
    ],
    hi: [
      "सभी आवासीय ब्लॉकों के लिए 24/7 स्वच्छ पेयजल आपूर्ति।",
      "150+ पर्यावरण-अनुकूल सौर स्ट्रीट लाइटों की स्थापना।",
      "साप्ताहिक सीधे मतदाता प्रतिक्रिया पोर्टल की स्थापना।"
    ],
    mr: [
      "सर्व निवासी ब्लॉक्ससाठी 24/7 स्वच्छ पिण्याच्या पाण्याचा पुरवठा.",
      "१५०+ पर्यावरणपूरक सौर पथदिव्यांची जोडणी.",
      "थेट मतदार संवाद व अभिप्राय पोर्टलची स्थापना."
    ],
    te: [
      "అన్ని నివాస ప్రాంతాలకు 24/7 స్వచ్ఛమైన త్రాగునీటి సరఫరా.",
      "150+ పర్యావరణ అనుకూల సౌర వీధి దీపాల ఏర్పాటు.",
      "నేరుగా ఓటర్ల నుండి ఫీడ్‌బ్యాక్ సేకరించే పోర్టల్ ఏర్పాటు."
    ],
    kn: [
      "ಎಲ್ಲಾ ವಸತಿ ಪ್ರದೇಶಗಳಿಗೆ 24/7 ಶುದ್ಧ ಕುಡಿಯುವ ನೀರಿನ ಪೂರೈಕೆ.",
      "150+ ಪರಿಸರ ಸ್ನೇಹಿ ಸೌರ ಬೀದಿ ದೀಪಗಳ ಅಳವಡಿಕೆ.",
      "ನೇರ ಮತದಾರ ಪ್ರತಿಕ್ರಿಯೆ ಪೋರ್ಟಲ್ ಸ್ಥಾಪನೆ."
    ],
    ta: [
      "அனைத்து குடியிருப்பு பகுதிகளுக்கும் 24/7 சுத்தமான குடிநீர் வழங்கல்.",
      "150+ சுற்றுச்சூழல் நட்பு சூரிய தெரு விளக்குகள் நிறுவுதல்.",
      "நேரடி வாக்காளர் கருத்து போர்ட்டல் நிறுவுதல்."
    ],
    bn: [
      "সকল আবাসিক এলাকায় 24/7 বিশুদ্ধ পানীয় জলের সরবরাহ।",
      "150+ পরিবেশবান্ধব সৌর রাস্তার আলো স্থাপন।",
      "সরাসরি ভোটার প্রতিক্রিয়া পোর্টাল স্থাপন।"
    ],
    gu: [
      "તમામ રહેણાંક વિસ્તારો માટે 24/7 સ્વચ્છ પીવાના પાણીનો પુરવઠો.",
      "150+ પર્યાવરણ મિત્ર સોલર સ્ટ્રીટ લાઇટ્સની સ્થાપના.",
      "સીધા મતદાર પ્રતિસાદ પોર્ટલની સ્થાપના."
    ],
    ml: [
      "എല്ലാ റസിഡൻഷ്യൽ ബ്ലോക്കുകളിലേക്കും 24/7 ശുദ്ധമായ കുടിവെള്ള വിതരണം.",
      "150+ പരിസ്ഥിതി സൗഹൃദ സോളാർ സ്ട്രീറ്റ് ലൈറ്റുകൾ സ്ഥാപിക്കൽ.",
      "നേരിട്ടുള്ള വോട്ടർ ഫീഡ്ബാക്ക് പോർട്ടൽ സ്ഥാപിക്കൽ."
    ],
    pa: [
      "ਸਾਰੇ ਰਿਹਾਇਸ਼ੀ ਖੇਤਰਾਂ ਲਈ 24/7 ਸਾਫ਼ ਪੀਣ ਵਾਲੇ ਪਾਣੀ ਦੀ ਸਪਲਾਈ।",
      "150+ ਵਾਤਾਵਰਣ ਅਨੁਕੂਲ ਸੋਲਰ ਸਟ੍ਰੀਟ ਲਾਈਟਾਂ ਦੀ ਸਥਾਪਨਾ।",
      "ਸਿੱਧੇ ਵੋਟਰ ਫੀਡਬੈਕ ਪੋਰਟਲ ਦੀ ਸਥਾਪਨਾ।"
    ],
    od: [
      "ସମସ୍ତ ଆବାସିକ ଅଞ୍ଚଳ ପାଇଁ 24/7 ବିଶୁଦ୍ଧ ପାନୀୟ ଜଳ ଯୋଗାଣ।",
      "150+ ପରିବେଶ ଅନୁକୂଳ ସୌର ରାସ୍ତା ବତୀ ସ୍ଥାପନ।",
      "ସିଧା ଭୋଟର ମତାମତ ପୋର୍ଟାଲ ସ୍ଥାପନ।"
    ]
  });
  
  const [newPromise, setNewPromise] = useState("");
  
  // Preview Controls
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [previewLanguage, setPreviewLanguage] = useState("en");
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [youtubeAutoplay, setYoutubeAutoplay] = useState(false);

  // Mock analytics
  const [analytics, setAnalytics] = useState({
    views: 14250,
    downloads: 3820,
    shares: 1940
  });

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSymbolUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const sessionUser = localStorage.getItem("currentCustomerUser");
    if (sessionUser) {
      try {
        const parsed = JSON.parse(sessionUser);
        
        // Match from global candidates list
        const pool = JSON.parse(localStorage.getItem("poltica_candidates") || "[]");
        const matched = pool.find((c: any) => c.mobile === parsed.mobile || c.id === parsed.id);
        const activeUser = matched || parsed;
        setCandidate(activeUser);

        // Auto detect default language based on region
        const areaName = activeUser.area || activeUser.district || "";
        const autoLang = getAutoDetectedLanguage(areaName);
        const savedDefault = activeUser.defaultLanguage || autoLang;
        setDefaultLanguage(savedDefault);
        setActiveEditingLang(savedDefault);
        setPreviewLanguage(savedDefault);

        // Load custom fields if saved (merge with defaults so other languages don't go blank)
        if (activeUser.customHeadline) {
          if (typeof activeUser.customHeadline === "string") {
            setHeadlines(prev => ({ ...prev, [savedDefault]: activeUser.customHeadline }));
          } else {
            setHeadlines(prev => ({ ...prev, ...activeUser.customHeadline }));
          }
        }
        if (activeUser.customBio) {
          if (typeof activeUser.customBio === "string") {
            setBios(prev => ({ ...prev, [savedDefault]: activeUser.customBio }));
          } else {
            setBios(prev => ({ ...prev, ...activeUser.customBio }));
          }
        }
        if (activeUser.customBanner) setBannerUrl(activeUser.customBanner);
        if (activeUser.customSymbol) setSymbolUrl(activeUser.customSymbol);
        
        if (activeUser.customPromises) {
          if (Array.isArray(activeUser.customPromises)) {
            setPromisesByLang(prev => ({ ...prev, [savedDefault]: activeUser.customPromises }));
          } else {
            setPromisesByLang(prev => ({ ...prev, ...activeUser.customPromises }));
          }
        }
        
        if (activeUser.selectedTemplate) setSelectedTemplate(activeUser.selectedTemplate);
        
        if (activeUser.manifestoTitle) {
          if (typeof activeUser.manifestoTitle === "string") {
            setManifestoTitles(prev => ({ ...prev, [savedDefault]: activeUser.manifestoTitle }));
          } else {
            setManifestoTitles(prev => ({ ...prev, ...activeUser.manifestoTitle }));
          }
        }
        if (activeUser.youtubeUrl) setYoutubeUrl(activeUser.youtubeUrl);
        if (activeUser.youtubeAutoplay !== undefined) setYoutubeAutoplay(activeUser.youtubeAutoplay);
        if (activeUser.customPrimaryColor) setCustomPrimaryColor(activeUser.customPrimaryColor);
        if (activeUser.customAccentColor) setCustomAccentColor(activeUser.customAccentColor);
        if (activeUser.customTextColor) setCustomTextColor(activeUser.customTextColor);
        if (activeUser.customBorderColor) setCustomBorderColor(activeUser.customBorderColor);
      } catch (err) {}
    }
  }, []);

  const handleSavePageConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate) return;

    // Update global list
    const pool = JSON.parse(localStorage.getItem("poltica_candidates") || "[]");
    const updatedPool = pool.map((c: any) => {
      if (c.id === candidate.id || c.mobile === candidate.mobile) {
        return {
          ...c,
          customHeadline: headlines,
          customBio: bios,
          customBanner: bannerUrl,
          customSymbol: symbolUrl,
          customPromises: promisesByLang,
          selectedTemplate: selectedTemplate,
          manifestoTitle: manifestoTitles,
          defaultLanguage: defaultLanguage,
          youtubeUrl: youtubeUrl,
          youtubeAutoplay: youtubeAutoplay,
          customPrimaryColor: customPrimaryColor,
          customAccentColor: customAccentColor,
          customTextColor: customTextColor,
          customBorderColor: customBorderColor,
          // Generate simulated PDF link based on selected template
          manifestoUrl: `https://poltica.in/manifesto/${candidate.id}-${selectedTemplate}.pdf`
        };
      }
      return c;
    });
    localStorage.setItem("poltica_candidates", JSON.stringify(updatedPool));

    // Update session storage
    const updatedUser = {
      ...candidate,
      customHeadline: headlines,
      customBio: bios,
      customBanner: bannerUrl,
      customSymbol: symbolUrl,
      customPromises: promisesByLang,
      selectedTemplate: selectedTemplate,
      manifestoTitle: manifestoTitles,
      defaultLanguage: defaultLanguage,
      youtubeUrl: youtubeUrl,
      youtubeAutoplay: youtubeAutoplay,
      customPrimaryColor: customPrimaryColor,
      customAccentColor: customAccentColor,
      customTextColor: customTextColor,
      customBorderColor: customBorderColor,
      manifestoUrl: `https://poltica.in/manifesto/${candidate.id}-${selectedTemplate}.pdf`
    };
    localStorage.setItem("currentCustomerUser", JSON.stringify(updatedUser));
    setCandidate(updatedUser);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const copyToClipboard = () => {
    if (!candidate?.uniqueUrl) return;
    navigator.clipboard.writeText(`https://${candidate.uniqueUrl}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const addPromise = () => {
    if (!newPromise.trim()) return;
    const currentList = promisesByLang[activeEditingLang] || [];
    setPromisesByLang({
      ...promisesByLang,
      [activeEditingLang]: [...currentList, newPromise.trim()]
    });
    setNewPromise("");
  };

  const removePromise = (index: number) => {
    const currentList = promisesByLang[activeEditingLang] || [];
    setPromisesByLang({
      ...promisesByLang,
      [activeEditingLang]: currentList.filter((_, i) => i !== index)
    });
  };

  const currentTemplate = selectedTemplate === "custom" 
    ? {
        id: "custom",
        name: "Custom Theme",
        primaryColor: customPrimaryColor,
        secondaryColor: customBorderColor,
        accentColor: customAccentColor,
        textColor: customTextColor,
        bgClass: "",
        textClass: "",
        borderClass: "",
        badgeClass: ""
      }
    : (TEMPLATE_PRESETS.find(t => t.id === selectedTemplate) || TEMPLATE_PRESETS[0]);
  const activeEditingHeadline = headlines[activeEditingLang] || headlines["en"] || "";
  const activeEditingBio = bios[activeEditingLang] || bios["en"] || "";
  const activeEditingManifestoTitle = manifestoTitles[activeEditingLang] || manifestoTitles["en"] || "";
  const activeEditingPromises = promisesByLang[activeEditingLang] || promisesByLang["en"] || [];

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1e293b] dark:text-white flex items-center gap-2">
            <Globe className="h-8 w-8 text-[#2563eb]" />
            Campaign Page & Manifesto Builder
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build your unique candidate landing page, track performance, and design device-compatible manifestos.
          </p>
        </div>

        {candidate?.uniqueUrl && (
          <div className="flex items-center gap-2 bg-[#f1f5f9] dark:bg-zinc-800 p-2.5 rounded-lg border border-border/50 text-xs relative">
            <span className="font-mono text-[#2563eb] dark:text-[#93c5fd] select-all font-semibold">
              https://{candidate.uniqueUrl}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={copyToClipboard} title="Copy URL">
              {isCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            </Button>
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                type="button"
                className="h-7 w-7 text-muted-foreground" 
                onClick={() => {
                  console.log("Share menu toggled to:", !showShareMenu);
                  setShowShareMenu(!showShareMenu);
                }}
                title="Share options"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-border/65 z-[999] p-1.5 space-y-1">
                  <a 
                    href={`https://api.whatsapp.com/send?text=Check%20out%20my%20official%20campaign%20landing%20page%20and%20manifesto%20here:%20https://${candidate.uniqueUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold text-[#25D366] transition-colors"
                  >
                    <span>💬</span> WhatsApp Share
                  </a>
                  <a 
                    href={`https://twitter.com/intent/tweet?text=Check%20out%20my%20official%20campaign%20landing%20page%20and%20manifesto:%20https://${candidate.uniqueUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold text-sky-500 transition-colors"
                  >
                    <span>🐦</span> Share on X / Twitter
                  </a>
                  <a 
                    href={`https://www.facebook.com/sharer/sharer.php?u=https://${candidate.uniqueUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold text-blue-600 transition-colors"
                  >
                    <span>📘</span> Share on Facebook
                  </a>
                  <button 
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `${candidate?.name} - Campaign Page`,
                          url: `https://${candidate?.uniqueUrl}`
                        }).catch(() => {});
                      } else {
                        copyToClipboard();
                      }
                      setShowShareMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 text-left transition-colors"
                  >
                    <span>🔗</span> Native System Share
                  </button>
                </div>
              )}
            </div>
            <a 
              href={`https://${candidate.uniqueUrl}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="h-7 w-7 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-muted-foreground"
              title="Open Page"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Real-time Unique URL Analytics / Tracking Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur border-border/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#2563eb]" />
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Unique Visitors</p>
              <h3 className="text-2xl font-bold mt-1 text-[#1e293b] dark:text-white">{analytics.views.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur border-border/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Manifesto Downloads</p>
              <h3 className="text-2xl font-bold mt-1 text-[#1e293b] dark:text-white">{analytics.downloads.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Download className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur border-border/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-purple-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp Link Clicks</p>
              <h3 className="text-2xl font-bold mt-1 text-[#1e293b] dark:text-white">{analytics.shares.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Builders & Customizers */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSavePageConfig}>
            <Card className="bg-white/80 dark:bg-zinc-900/80 border-border/40 shadow-sm">
              <CardHeader className="border-b border-border/30 pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Palette className="h-5 w-5 text-[#2563eb]" />
                      Customize Landing Page
                    </CardTitle>
                    <CardDescription>
                      Modify headlines, bio, and images. Changes apply to the selected language tab.
                    </CardDescription>
                  </div>
                  
                  {/* Lang Selection Tabs */}
                  <div className="flex flex-wrap gap-1 bg-[#f1f5f9] dark:bg-zinc-800 p-1 rounded-lg border border-border/60 max-w-full">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setActiveEditingLang(lang.code)}
                        className={`px-2 py-1 text-[10px] rounded-md transition-all whitespace-nowrap ${
                          activeEditingLang === lang.code 
                            ? "bg-white dark:bg-zinc-700 text-[#2563eb] dark:text-[#93c5fd] font-semibold shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {lang.nativeName}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                
                {/* Default Language Selector Widget */}
                <div className="bg-[#f8fafc] dark:bg-zinc-900/40 p-3 rounded-lg border border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <Label className="font-bold text-xs flex items-center gap-1">
                      <Languages className="h-3.5 w-3.5 text-[#2563eb]" /> Default Public Language
                    </Label>
                    <span className="text-[10px] text-muted-foreground block">
                      Auto-detected or override candidate default language.
                    </span>
                  </div>
                  <select 
                    value={defaultLanguage} 
                    onChange={(e) => {
                      setDefaultLanguage(e.target.value);
                      setPreviewLanguage(e.target.value);
                    }} 
                    className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-xs text-[#1e293b] dark:text-zinc-200"
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.nativeName}) {lang.code === getAutoDetectedLanguage(candidate?.area || "") ? "• Region Preferred" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="candName">Candidate Name (Display)</Label>
                    <Input id="candName" readOnly value={candidate?.name || "Loading..."} className="bg-muted text-muted-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="candArea">Constituency / Town</Label>
                    <Input id="candArea" readOnly value={candidate?.area || candidate?.district || ""} className="bg-muted text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="headline">Page Hero Headline ({SUPPORTED_LANGUAGES.find(l => l.code === activeEditingLang)?.name})</Label>
                  <Input 
                    id="headline" 
                    placeholder="E.g., A Vision for Sadashiv Peth Development" 
                    value={activeEditingHeadline} 
                    onChange={(e) => setHeadlines({ ...headlines, [activeEditingLang]: e.target.value })} 
                    className="bg-background/50 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio">Voter Introduction & Candidate Bio ({SUPPORTED_LANGUAGES.find(l => l.code === activeEditingLang)?.name})</Label>
                  <Textarea 
                    id="bio" 
                    placeholder="Briefly state your commitment and experience..." 
                    value={activeEditingBio} 
                    onChange={(e) => setBios({ ...bios, [activeEditingLang]: e.target.value })}
                    className="bg-background/50 min-h-[80px]"
                  />
                </div>

                {/* YouTube Video Link Integration Section */}
                <div className="bg-[#f8fafc] dark:bg-zinc-900/40 p-4 rounded-xl border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="youtubeUrl" className="font-semibold text-sm flex items-center gap-1.5">
                      <span className="text-red-500 font-bold">▶</span> YouTube Campaign Video
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Embed voter greetings, messages, or interviews</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-8">
                      <Input 
                        id="youtubeUrl"
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="bg-background/70 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-4 flex items-center justify-end gap-2">
                      <Label htmlFor="youtubeAutoplay" className="text-xs font-semibold cursor-pointer select-none">
                        Autoplay with Sound
                      </Label>
                      <input 
                        id="youtubeAutoplay"
                        type="checkbox"
                        checked={youtubeAutoplay}
                        onChange={(e) => setYoutubeAutoplay(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Campaign Banner Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-[#2563eb]" /> Campaign Banner Image
                    </Label>
                    {bannerUrl ? (
                      <Attachment orientation="vertical" className="w-full">
                        <AttachmentMedia variant="image">
                          <img src={bannerUrl} alt="Banner Preview" />
                        </AttachmentMedia>
                        <AttachmentContent className="flex flex-row items-center justify-between mt-1">
                          <div className="flex flex-col min-w-0">
                            <AttachmentTitle>campaign-banner.jpg</AttachmentTitle>
                            <AttachmentDescription>Custom Banner Image</AttachmentDescription>
                          </div>
                          <AttachmentActions>
                            <Label htmlFor="banner-upload" className="cursor-pointer flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                              <ImageIcon className="h-4 w-4" />
                            </Label>
                            <AttachmentAction aria-label="Remove Image" onClick={() => setBannerUrl("")}>
                              <XIcon className="h-4 w-4" />
                            </AttachmentAction>
                          </AttachmentActions>
                        </AttachmentContent>
                        <input 
                          id="banner-upload" 
                          type="file" 
                          accept="image/*" 
                          onChange={handleBannerChange} 
                          className="hidden"
                        />
                      </Attachment>
                    ) : (
                      <div className="border-2 border-dashed border-border/70 hover:border-primary/50 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-background/50 transition-colors relative min-h-[140px]">
                        <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-xs font-semibold">Click to upload banner</p>
                        <p className="text-[9px] text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                        <input 
                          id="banner-upload" 
                          type="file" 
                          accept="image/*" 
                          onChange={handleBannerChange} 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Candidate Party Symbol Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <UploadCloud className="h-4 w-4 text-purple-500" /> Candidate Party Symbol
                    </Label>
                    {symbolUrl ? (
                      <Attachment orientation="horizontal" className="w-full">
                        <AttachmentMedia variant="icon" className="rounded-full bg-white border border-border">
                          <img src={symbolUrl} alt="Symbol Preview" className="object-cover size-full" />
                        </AttachmentMedia>
                        <AttachmentContent>
                          <AttachmentTitle>party-symbol.png</AttachmentTitle>
                          <AttachmentDescription>Candidate Party Symbol</AttachmentDescription>
                        </AttachmentContent>
                        <AttachmentActions>
                          <Label htmlFor="symbol-upload" className="cursor-pointer flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                            <UploadCloud className="h-4 w-4" />
                          </Label>
                          <AttachmentAction aria-label="Remove Symbol" onClick={() => setSymbolUrl("")}>
                            <XIcon className="h-4 w-4" />
                          </AttachmentAction>
                        </AttachmentActions>
                        <input 
                          id="symbol-upload" 
                          type="file" 
                          accept="image/*" 
                          onChange={handleSymbolChange} 
                          className="hidden"
                        />
                      </Attachment>
                    ) : (
                      <div className="border-2 border-dashed border-border/70 hover:border-primary/50 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-background/50 transition-colors relative min-h-[140px]">
                        <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-xs font-semibold">Click to upload symbol</p>
                        <p className="text-[9px] text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                        <input 
                          id="symbol-upload" 
                          type="file" 
                          accept="image/*" 
                          onChange={handleSymbolChange} 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                        />
                      </div>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Manifesto Design Section */}
            <Card className="bg-white/80 dark:bg-zinc-900/80 border-border/40 mt-6 shadow-sm">
              <CardHeader className="border-b border-border/30 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-500" />
                  Manifesto Blueprint Builder
                </CardTitle>
                <CardDescription>
                  Choose a model template design and add promises. This generates a device-compatible PDF.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Choose Design Presets */}
                <div className="space-y-2">
                  <Label>Select Template Design Theme</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TEMPLATE_PRESETS.map((preset) => (
                      <div 
                        key={preset.id}
                        onClick={() => setSelectedTemplate(preset.id)}
                        className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all ${
                          selectedTemplate === preset.id 
                            ? "border-primary bg-primary/5 shadow-sm scale-[1.02]" 
                            : "border-border/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        <div 
                          className="h-4 w-full rounded-sm mb-2"
                          style={{ background: `linear-gradient(135deg, ${preset.primaryColor}, ${preset.accentColor})` }}
                        />
                        <span className="text-xs font-medium block">{preset.name}</span>
                      </div>
                    ))}
                    
                    {/* Custom Theme selection option */}
                    <div 
                      onClick={() => setSelectedTemplate("custom")}
                      className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all ${
                        selectedTemplate === "custom" 
                          ? "border-primary bg-primary/5 shadow-sm scale-[1.02]" 
                          : "border-border/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <div 
                        className="h-4 w-full rounded-sm mb-2"
                        style={{ background: `linear-gradient(135deg, ${customPrimaryColor}, ${customAccentColor})` }}
                      />
                      <span className="text-xs font-medium block">Custom Theme</span>
                    </div>
                  </div>
                </div>

                {/* Custom Color Designer Subpanel */}
                <div className="bg-[#f8fafc] dark:bg-zinc-900/40 p-4 rounded-xl border border-border/50 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#1e293b] dark:text-zinc-100 flex items-center gap-1.5">
                        🎨 Custom Theme Color Designer
                      </h4>
                      <p className="text-[10px] text-muted-foreground">Adjust colors to match your campaign branding</p>
                    </div>
                    {selectedTemplate !== "custom" && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-6 text-[9px] font-semibold bg-white dark:bg-zinc-800"
                        onClick={() => {
                          const current = TEMPLATE_PRESETS.find(t => t.id === selectedTemplate) || TEMPLATE_PRESETS[0];
                          setCustomPrimaryColor(current.primaryColor);
                          setCustomAccentColor(current.accentColor);
                          setCustomTextColor(current.textColor);
                          setCustomBorderColor(current.secondaryColor || current.accentColor);
                          setSelectedTemplate("custom");
                        }}
                      >
                        Customize This Theme
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="primaryColor" className="text-[10px] font-bold block text-muted-foreground">Background Color</Label>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input 
                          id="primaryColor"
                          type="color" 
                          value={selectedTemplate === "custom" ? customPrimaryColor : (TEMPLATE_PRESETS.find(t => t.id === selectedTemplate)?.primaryColor || "#0F2027")}
                          onChange={(e) => {
                            if (selectedTemplate !== "custom") {
                              const current = TEMPLATE_PRESETS.find(t => t.id === selectedTemplate) || TEMPLATE_PRESETS[0];
                              setCustomAccentColor(current.accentColor);
                              setCustomTextColor(current.textColor);
                              setCustomBorderColor(current.secondaryColor || current.accentColor);
                            }
                            setSelectedTemplate("custom");
                            setCustomPrimaryColor(e.target.value);
                          }}
                          className="h-6 w-8 rounded cursor-pointer border border-border/60 p-0 bg-transparent"
                        />
                        <span className="text-[9px] font-mono select-all uppercase">
                          {selectedTemplate === "custom" ? customPrimaryColor : (TEMPLATE_PRESETS.find(t => t.id === selectedTemplate)?.primaryColor || "#0F2027")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="accentColor" className="text-[10px] font-bold block text-muted-foreground">Accent & Button</Label>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input 
                          id="accentColor"
                          type="color" 
                          value={selectedTemplate === "custom" ? customAccentColor : (TEMPLATE_PRESETS.find(t => t.id === selectedTemplate)?.accentColor || "#2C5364")}
                          onChange={(e) => {
                            if (selectedTemplate !== "custom") {
                              const current = TEMPLATE_PRESETS.find(t => t.id === selectedTemplate) || TEMPLATE_PRESETS[0];
                              setCustomPrimaryColor(current.primaryColor);
                              setCustomTextColor(current.textColor);
                              setCustomBorderColor(current.secondaryColor || current.accentColor);
                            }
                            setSelectedTemplate("custom");
                            setCustomAccentColor(e.target.value);
                          }}
                          className="h-6 w-8 rounded cursor-pointer border border-border/60 p-0 bg-transparent"
                        />
                        <span className="text-[9px] font-mono select-all uppercase">
                          {selectedTemplate === "custom" ? customAccentColor : (TEMPLATE_PRESETS.find(t => t.id === selectedTemplate)?.accentColor || "#2C5364")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="textColor" className="text-[10px] font-bold block text-muted-foreground">Text Color</Label>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input 
                          id="textColor"
                          type="color" 
                          value={selectedTemplate === "custom" ? customTextColor : (TEMPLATE_PRESETS.find(t => t.id === selectedTemplate)?.textColor || "#FFFFFF")}
                          onChange={(e) => {
                            if (selectedTemplate !== "custom") {
                              const current = TEMPLATE_PRESETS.find(t => t.id === selectedTemplate) || TEMPLATE_PRESETS[0];
                              setCustomPrimaryColor(current.primaryColor);
                              setCustomAccentColor(current.accentColor);
                              setCustomBorderColor(current.secondaryColor || current.accentColor);
                            }
                            setSelectedTemplate("custom");
                            setCustomTextColor(e.target.value);
                          }}
                          className="h-6 w-8 rounded cursor-pointer border border-border/60 p-0 bg-transparent"
                        />
                        <span className="text-[9px] font-mono select-all uppercase">
                          {selectedTemplate === "custom" ? customTextColor : (TEMPLATE_PRESETS.find(t => t.id === selectedTemplate)?.textColor || "#FFFFFF")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="borderColor" className="text-[10px] font-bold block text-muted-foreground">Border Color</Label>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input 
                          id="borderColor"
                          type="color" 
                          value={selectedTemplate === "custom" ? customBorderColor : (TEMPLATE_PRESETS.find(t => t.id === selectedTemplate)?.secondaryColor || "#203A43")}
                          onChange={(e) => {
                            if (selectedTemplate !== "custom") {
                              const current = TEMPLATE_PRESETS.find(t => t.id === selectedTemplate) || TEMPLATE_PRESETS[0];
                              setCustomPrimaryColor(current.primaryColor);
                              setCustomAccentColor(current.accentColor);
                              setCustomTextColor(current.textColor);
                            }
                            setSelectedTemplate("custom");
                            setCustomBorderColor(e.target.value);
                          }}
                          className="h-6 w-8 rounded cursor-pointer border border-border/60 p-0 bg-transparent"
                        />
                        <span className="text-[9px] font-mono select-all uppercase">
                          {selectedTemplate === "custom" ? customBorderColor : (TEMPLATE_PRESETS.find(t => t.id === selectedTemplate)?.secondaryColor || "#203A43")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/30 pt-5 mt-5"></div>

                <div className="space-y-1.5">
                  <Label htmlFor="manifestoTitle">Manifesto Document Title ({SUPPORTED_LANGUAGES.find(l => l.code === activeEditingLang)?.name})</Label>
                  <Input 
                    id="manifestoTitle" 
                    value={activeEditingManifestoTitle} 
                    onChange={(e) => setManifestoTitles({ ...manifestoTitles, [activeEditingLang]: e.target.value })} 
                    className="bg-background/50 font-medium"
                  />
                </div>

                {/* Key Commitments */}
                <div className="space-y-3">
                  <Label>Key Electoral Promises & Blueprint Goals ({SUPPORTED_LANGUAGES.find(l => l.code === activeEditingLang)?.name})</Label>
                  
                  <div className="space-y-2">
                    {activeEditingPromises.map((promise, index) => (
                      <div key={index} className="flex items-start gap-2 bg-[#f8f9fa] dark:bg-zinc-850 p-2.5 rounded border border-border/40 text-xs">
                        <span className="h-4 w-4 bg-[#2563eb]/10 text-[#2563eb] rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{index + 1}</span>
                        <p className="flex-1 text-[#1e293b] dark:text-zinc-200">{promise}</p>
                        <button 
                          type="button" 
                          onClick={() => removePromise(index)}
                          className="text-destructive hover:text-red-500 font-semibold px-1 text-[10px]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add a new electoral promise..." 
                      value={newPromise}
                      onChange={(e) => setNewPromise(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPromise(); } }}
                      className="bg-background/50 text-xs"
                    />
                    <Button type="button" onClick={addPromise} size="sm" className="bg-[#2563eb] text-white">Add</Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/30 flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">Saving updates candidate profiles and compiles device-compatible outputs immediately.</p>
                  <Button type="submit" disabled={isSaved} className="bg-primary text-primary-foreground">
                    {isSaved ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-emerald-400" /> Saved Successfully
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Save & Compile Page
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Right Column: Device-Compatible Rendering & Simulation */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Device Compatibility Preview</span>
            <div className="flex bg-[#f1f5f9] dark:bg-zinc-800 p-1 rounded-lg border border-border/60">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 w-7 p-0 ${previewDevice === "mobile" ? "bg-white dark:bg-zinc-700 shadow-sm" : ""}`} 
                onClick={() => setPreviewDevice("mobile")}
                title="Mobile Compact View"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 w-7 p-0 ${previewDevice === "tablet" ? "bg-white dark:bg-zinc-700 shadow-sm" : ""}`} 
                onClick={() => setPreviewDevice("tablet")}
                title="Tablet Responsive View"
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 w-7 p-0 ${previewDevice === "desktop" ? "bg-white dark:bg-zinc-700 shadow-sm" : ""}`} 
                onClick={() => setPreviewDevice("desktop")}
                title="Desktop High-Res View"
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Interactive Simulated Device Display container */}
          <div className="flex items-center justify-center bg-zinc-150 dark:bg-zinc-950 p-4 sm:p-6 rounded-2xl border border-border/60 min-h-[580px] transition-all">
            
            <div className={`bg-white dark:bg-zinc-900 shadow-xl overflow-hidden border border-border/70 transition-all duration-300 ${
              previewDevice === "mobile" ? "w-[300px] h-[520px] rounded-[2rem]" :
              previewDevice === "tablet" ? "w-[440px] h-[550px] rounded-2xl" :
              "w-full h-[580px] rounded-lg"
            }`}>
              
              {/* Device Notch / Screen Header */}
              {previewDevice === "mobile" && (
                <div className="w-full bg-slate-900 h-6 flex items-center justify-center shrink-0">
                  <div className="w-20 h-3.5 bg-black rounded-b-xl" />
                </div>
              )}

              {/* simulated landing page content */}
              <div className="h-full overflow-y-auto flex flex-col text-left text-xs bg-slate-50 dark:bg-zinc-900/30">
                
                {/* Voter simulated Language Switcher Dropdown (Live Preview) */}
                <div className="bg-slate-200 dark:bg-zinc-800 p-2 flex items-center justify-between shrink-0 border-b border-border/40">
                  <span className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Languages className="h-3 w-3 text-[#2563eb]" /> Voter Language:
                  </span>
                  <div className="flex gap-1">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setPreviewLanguage(lang.code)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${
                          previewLanguage === lang.code 
                            ? "bg-[#2563eb] text-white" 
                            : "bg-white dark:bg-zinc-700 text-[#1e293b] dark:text-zinc-300 hover:bg-zinc-100"
                        }`}
                      >
                        {lang.code}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hero Banner header */}
                <div className="relative h-28 sm:h-36 shrink-0 bg-slate-800 overflow-hidden">
                  <img src={bannerUrl} alt="Campaign Hero" className="object-cover w-full h-full opacity-70" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  
                  {/* Symbol Overlay */}
                  <div className="absolute bottom-2 right-3 h-10 w-10 rounded-full border-2 border-white bg-white overflow-hidden shadow-md">
                    <img src={symbolUrl} alt="Party Symbol" className="object-cover h-full w-full" />
                  </div>

                  <div className="absolute bottom-2 left-3 text-white">
                    <span className="text-[9px] uppercase tracking-wider bg-[#2563eb] px-1.5 py-0.5 rounded font-bold">
                      {candidate?.id || "CAN-001"}
                    </span>
                    <h4 className="font-bold text-sm mt-0.5 truncate max-w-[180px]">{candidate?.name || "Rahul Sharma"}</h4>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-4 flex-1">
                  
                  {/* Custom Headline */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-[#1e293b] dark:text-white leading-tight text-sm text-balance">
                      {headlines[previewLanguage] || headlines["en"] || ""}
                    </h3>
                    <p className="text-muted-foreground text-[10px] leading-relaxed">
                      {bios[previewLanguage] || bios["en"] || ""}
                    </p>
                  </div>

                  {/* YouTube Embed Player (Live Preview) */}
                  {youtubeUrl && getYoutubeEmbedUrl(youtubeUrl, youtubeAutoplay) && (
                    <div className="w-full rounded-xl overflow-hidden shadow-md border border-border/40 aspect-video bg-black relative shrink-0">
                      <iframe 
                        className="w-full h-full absolute inset-0 border-0"
                        src={getYoutubeEmbedUrl(youtubeUrl, youtubeAutoplay)}
                        title="Campaign Video Player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        onLoad={(e) => {
                          // When autoplay is enabled, unmute the player after it loads
                          // YouTube IFrame API accepts postMessage commands to control playback
                          if (youtubeAutoplay) {
                            const iframe = e.currentTarget;
                            // Short delay to let the player initialize, then unmute + set volume
                            setTimeout(() => {
                              try {
                                iframe.contentWindow?.postMessage(
                                  JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
                                  '*'
                                );
                                iframe.contentWindow?.postMessage(
                                  JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
                                  '*'
                                );
                              } catch (err) {
                                // Cross-origin restrictions may prevent this on some browsers
                              }
                            }, 1500);
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Dynamic Custom Manifesto PDF Preset Section */}
                  <div 
                    className="p-4 rounded-xl space-y-3 shadow-md"
                    style={{
                      background: currentTemplate.primaryColor,
                      color: currentTemplate.textColor,
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderColor: currentTemplate.secondaryColor
                    }}
                  >
                    
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4" style={{ color: currentTemplate.accentColor }} />
                        <span className="font-bold text-[11px] uppercase tracking-wider">
                          {manifestoTitles[previewLanguage] || manifestoTitles["en"] || ""}
                        </span>
                      </div>
                      <span 
                        className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{ 
                          background: `${currentTemplate.secondaryColor}80`,
                          color: currentTemplate.accentColor 
                        }}
                      >
                        {currentTemplate.name}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] opacity-90 italic">Key Blueprint Goals:</p>
                      
                      <div className="space-y-1.5">
                        {(promisesByLang[previewLanguage] || promisesByLang["en"] || []).map((promise, index) => (
                          <div key={index} className="flex items-start gap-1.5 text-[10px]">
                            <span style={{ color: currentTemplate.accentColor }} className="font-bold shrink-0">✓</span>
                            <span className="opacity-95 leading-relaxed">{promise}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[8px] opacity-75 font-mono">Compatible with iOS & Android</span>
                      <Button type="button" size="sm" className="h-6 px-2 text-[9px] bg-white text-slate-900 hover:bg-slate-100 flex items-center gap-1 font-semibold">
                        <Download className="h-2.5 w-2.5" /> Download manifesto.pdf
                      </Button>
                    </div>

                  </div>

                  {/* Voter contact widget */}
                  <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg border border-border/40 space-y-2 shadow-sm text-center">
                    <p className="font-bold text-[10px] text-[#1e293b] dark:text-zinc-100">Send direct feedback to {candidate?.name || "us"}</p>
                    <Input disabled placeholder="Your Name" className="h-7 text-[10px] bg-background/50" />
                    <Textarea disabled placeholder="Enter suggestions/issues..." className="min-h-[50px] text-[10px] bg-background/50 resize-none" />
                    <Button disabled size="sm" className="h-6 w-full text-[9px] bg-[#2563eb] text-white">Submit Feedback</Button>
                  </div>

                </div>

                {/* Simulated Footer */}
                <div className="bg-slate-100 dark:bg-[#1b1b1b] p-3 text-center text-[9px] text-muted-foreground border-t border-border/40 mt-auto">
                  <p>© 2026 Campaign Powered by Poltica Platform</p>
                </div>

              </div>

            </div>

          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-border/40 text-xs space-y-2">
            <span className="font-bold flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Region auto-detected: {SUPPORTED_LANGUAGES.find(l => l.code === defaultLanguage)?.name || "English"} ({defaultLanguage})
            </span>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Voter auto-loads the preferred regional language (e.g., Kannada for Karnataka, Marathi for Maharashtra, Tamil for Tamil Nadu) based on candidate's constituency, overrideable manually.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
