"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

type AppMode = "browse" | "list" | "deals";
type ListingStep = "capture" | "draft" | "preview" | "published";
type ListingType = "All" | "Rooms" | "HDB" | "Condo";

type Listing = {
  id: number;
  title: string;
  area: string;
  type: Exclude<ListingType, "All">;
  price: number;
  beds: string;
  available: string;
  lister: "Owner" | "Agent";
  tone: string;
  description: string;
};

const starterListings: Listing[] = [
  {
    id: 1,
    title: "Sunny 4-room near Bishan MRT",
    area: "Bishan Street 13",
    type: "HDB",
    price: 3750,
    beds: "3 bed · Furnished",
    available: "Available 1 Sep",
    lister: "Owner",
    tone: "sunset",
    description:
      "Bright, breezy home with an efficient layout, updated kitchen and a sheltered walk to Bishan MRT.",
  },
  {
    id: 2,
    title: "Calm common room in Tiong Bahru",
    area: "Tiong Bahru Road",
    type: "Rooms",
    price: 1350,
    beds: "Common room · Owner staying",
    available: "Available now",
    lister: "Owner",
    tone: "mint",
    description:
      "A quiet, furnished room in a friendly owner-occupied home near cafés, buses and Tiong Bahru Market.",
  },
  {
    id: 3,
    title: "City-view 2-bed at Paya Lebar",
    area: "Paya Lebar Quarter",
    type: "Condo",
    price: 4300,
    beds: "2 bed · 2 bath",
    available: "Available 15 Aug",
    lister: "Agent",
    tone: "sky",
    description:
      "High-floor private apartment with city views, full facilities and direct access to transport and retail.",
  },
  {
    id: 4,
    title: "Family 5-room beside Clementi Mall",
    area: "Clementi Avenue 3",
    type: "HDB",
    price: 4050,
    beds: "3 bed · Part-furnished",
    available: "Available 1 Oct",
    lister: "Agent",
    tone: "lilac",
    description:
      "Generous family home with a practical study corner and excellent access to schools, shops and Clementi MRT.",
  },
];

const filters: ListingType[] = ["All", "Rooms", "HDB", "Condo"];

export default function Home() {
  const [mode, setMode] = useState<AppMode>("browse");
  const [listingStep, setListingStep] = useState<ListingStep>("capture");
  const [filter, setFilter] = useState<ListingType>("All");
  const [search, setSearch] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [listingKind, setListingKind] = useState("Whole HDB unit");
  const [listingArea, setListingArea] = useState("Bishan Street 13");
  const [availability, setAvailability] = useState("2026-09-01");
  const [askingRent, setAskingRent] = useState(3750);
  const [listingTitle, setListingTitle] = useState("Bright 4-room near Bishan MRT");
  const [viewingSent, setViewingSent] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [toast, setToast] = useState("");

  const visibleListings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return starterListings.filter((listing) => {
      const matchesFilter = filter === "All" || listing.type === filter;
      const matchesSearch =
        !query ||
        `${listing.title} ${listing.area} ${listing.type}`.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  function switchMode(nextMode: AppMode) {
    setMode(nextMode);
    setToast("");
    if (nextMode !== "browse") setSelectedListing(null);
  }

  function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const names = Array.from(event.target.files ?? []).map((file) => file.name);
    setPhotoNames(names);
    if (names.length) setToast(`${names.length} photo${names.length > 1 ? "s" : ""} ready for AI`);
  }

  function generateDraft() {
    if (!photoNames.length) {
      setPhotoNames(["living-room.jpg", "bedroom.jpg", "kitchen.jpg"]);
    }
    setListingStep("draft");
    setToast("AI draft created from your property photos");
  }

  function submitViewing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setViewingSent(true);
    setToast("Viewing request sent to the lister");
  }

  return (
    <main className="app-shell">
      <aside className="desktop-rail" aria-label="LeaseKaki navigation">
        <Brand />
        <nav className="rail-nav">
          <NavButton active={mode === "browse"} icon="⌂" label="Explore" onClick={() => switchMode("browse")} />
          <NavButton active={mode === "list"} icon="◎" label="List a home" onClick={() => switchMode("list")} />
          <NavButton active={mode === "deals"} icon="✓" label="My deals" onClick={() => switchMode("deals")} />
        </nav>
        <div className="rail-note">
          <span className="eyebrow">FREE PILOT</span>
          <strong>List and transact free for 6 months.</strong>
          <p>No deposit or rent is collected by LeaseKaki.</p>
        </div>
        <button className="profile-button" type="button">
          <span className="avatar">CW</span>
          <span><strong>Chee Wee</strong><small>Owner mode</small></span>
          <span>⌄</span>
        </button>
      </aside>

      <section className="app-stage">
        <header className="mobile-header">
          <Brand />
          <button className="icon-button" type="button" aria-label="Notifications">●</button>
        </header>

        {mode === "browse" && !selectedListing && (
          <BrowseView
            filter={filter}
            search={search}
            listings={visibleListings}
            onFilter={setFilter}
            onSearch={setSearch}
            onSelect={setSelectedListing}
            onList={() => switchMode("list")}
          />
        )}

        {mode === "browse" && selectedListing && (
          <ListingDetail
            listing={selectedListing}
            viewingSent={viewingSent}
            chatOpen={chatOpen}
            offerOpen={offerOpen}
            onBack={() => {
              setSelectedListing(null);
              setViewingSent(false);
              setChatOpen(false);
              setOfferOpen(false);
            }}
            onViewing={submitViewing}
            onChat={() => setChatOpen((open) => !open)}
            onOffer={() => setOfferOpen((open) => !open)}
          />
        )}

        {mode === "list" && (
          <ListingFlow
            step={listingStep}
            photoNames={photoNames}
            listingKind={listingKind}
            listingArea={listingArea}
            availability={availability}
            askingRent={askingRent}
            listingTitle={listingTitle}
            onPhotos={handlePhotos}
            onGenerate={generateDraft}
            onStep={setListingStep}
            onKind={setListingKind}
            onArea={setListingArea}
            onAvailability={setAvailability}
            onRent={setAskingRent}
            onTitle={setListingTitle}
            onBrowse={() => switchMode("browse")}
          />
        )}

        {mode === "deals" && (
          <DealsView agreementOpen={agreementOpen} onAgreement={() => setAgreementOpen((open) => !open)} />
        )}

        <nav className="mobile-nav" aria-label="Primary navigation">
          <NavButton active={mode === "browse"} icon="⌂" label="Explore" onClick={() => switchMode("browse")} />
          <NavButton active={mode === "list"} icon="◎" label="List" onClick={() => switchMode("list")} />
          <NavButton active={mode === "deals"} icon="✓" label="Deals" onClick={() => switchMode("deals")} />
        </nav>
      </section>

      {toast && (
        <button className="toast" type="button" onClick={() => setToast("")} aria-label="Dismiss message">
          <span>✓</span>{toast}
        </button>
      )}
    </main>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="LeaseKaki">
      <span className="brand-mark">LK</span>
      <span>Lease<span>Kaki</span></span>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button className={`nav-button ${active ? "is-active" : ""}`} type="button" onClick={onClick} aria-current={active ? "page" : undefined}>
      <span className="nav-icon">{icon}</span><span>{label}</span>
    </button>
  );
}

function BrowseView({
  filter,
  search,
  listings,
  onFilter,
  onSearch,
  onSelect,
  onList,
}: {
  filter: ListingType;
  search: string;
  listings: Listing[];
  onFilter: (value: ListingType) => void;
  onSearch: (value: string) => void;
  onSelect: (listing: Listing) => void;
  onList: () => void;
}) {
  return (
    <div className="view browse-view">
      <section className="browse-hero">
        <div className="hero-copy">
          <span className="eyebrow light">SINGAPORE RENTALS, SIMPLIFIED</span>
          <h1>Find a place.<br />Skip the runaround.</h1>
          <p>Fresh owner and authorised-agent listings, with every next step handled in one place.</p>
        </div>
        <button className="snap-card" type="button" onClick={onList}>
          <span className="snap-icon">◎</span>
          <span><small>Have a property?</small><strong>Snap to list in 60 sec</strong></span>
          <span>→</span>
        </button>
      </section>

      <section className="browse-body">
        <div className="search-row">
          <label className="search-box">
            <span>⌕</span>
            <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="MRT, estate or project" aria-label="Search rentals" />
          </label>
          <button className="filter-button" type="button" aria-label="More filters">≡</button>
        </div>
        <div className="filter-tabs" aria-label="Property type">
          {filters.map((item) => (
            <button key={item} className={filter === item ? "is-active" : ""} type="button" onClick={() => onFilter(item)}>{item}</button>
          ))}
        </div>
        <div className="section-heading">
          <div><span className="eyebrow">FRESH LISTINGS</span><h2>Homes worth a look</h2></div>
          <span className="result-count">{listings.length} found</span>
        </div>
        {listings.length ? (
          <div className="listing-grid">
            {listings.map((listing) => <ListingCard key={listing.id} listing={listing} onSelect={onSelect} />)}
          </div>
        ) : (
          <div className="empty-state"><span>⌕</span><h3>No exact matches yet</h3><p>Try another estate or remove a filter.</p></div>
        )}
      </section>
    </div>
  );
}

function ListingCard({ listing, onSelect }: { listing: Listing; onSelect: (listing: Listing) => void }) {
  return (
    <button className="listing-card" type="button" onClick={() => onSelect(listing)}>
      <span className={`property-image ${listing.tone}`}>
        <span className="property-shape"><i /><i /><i /></span>
        <span className="lister-badge">{listing.lister}</span>
        <span className="save-button">♡</span>
      </span>
      <span className="listing-copy">
        <span className="listing-topline"><strong>${listing.price.toLocaleString()}<small>/mo</small></strong><span>{listing.type}</span></span>
        <strong className="listing-name">{listing.title}</strong>
        <span className="listing-meta">{listing.area}</span>
        <span className="listing-meta">{listing.beds} · {listing.available}</span>
      </span>
    </button>
  );
}

function ListingDetail({
  listing,
  viewingSent,
  chatOpen,
  offerOpen,
  onBack,
  onViewing,
  onChat,
  onOffer,
}: {
  listing: Listing;
  viewingSent: boolean;
  chatOpen: boolean;
  offerOpen: boolean;
  onBack: () => void;
  onViewing: (event: FormEvent<HTMLFormElement>) => void;
  onChat: () => void;
  onOffer: () => void;
}) {
  return (
    <div className="view detail-view">
      <div className={`detail-image property-image ${listing.tone}`}>
        <span className="property-shape large"><i /><i /><i /></span>
        <button className="round-button back" type="button" onClick={onBack} aria-label="Back to listings">←</button>
        <button className="round-button save" type="button" aria-label="Save listing">♡</button>
        <span className="image-counter">1 / 8</span>
      </div>
      <div className="detail-content">
        <div className="detail-title-row">
          <div><span className="eyebrow">{listing.lister.toUpperCase()} LISTING</span><h1>{listing.title}</h1><p>{listing.area} · Exact unit shared after viewing acceptance</p></div>
          <div className="detail-price"><strong>${listing.price.toLocaleString()}</strong><span>/month</span></div>
        </div>
        <div className="fact-strip"><span><strong>{listing.type}</strong>Home type</span><span><strong>{listing.beds.split(" · ")[0]}</strong>Bedrooms</span><span><strong>1 Sep</strong>Available</span></div>
        <p className="description">{listing.description}</p>
        <section className="rent-evidence">
          <div className="evidence-heading"><div><span className="eyebrow">RENT EVIDENCE</span><h3>Fair-market context</h3></div><span className="confidence">Medium confidence</span></div>
          <div className="range-label"><span>$3,550</span><strong>Asking ${listing.price.toLocaleString()}</strong><span>$3,900</span></div>
          <div className="range-track"><span /></div>
          <p>Based on recent official HDB/URA rental data, adjusted for location, furnishing and availability. Illustrative prototype estimate.</p>
        </section>
        <div className="detail-actions">
          <button className="button secondary" type="button" onClick={onChat}>Chat</button>
          <button className="button secondary" type="button" onClick={onOffer}>Make offer</button>
        </div>
        {chatOpen && <div className="inline-panel"><strong>Chat with the lister</strong><div className="message-bubble">Hi! Is the property still available for a September move-in?</div><div className="message-input"><input placeholder="Write a message" /><button type="button">Send</button></div></div>}
        {offerOpen && <div className="inline-panel offer-panel"><strong>Structured offer</strong><div className="form-grid"><label>Monthly rent<input defaultValue={listing.price - 50} type="number" /></label><label>Lease term<select defaultValue="24"><option value="12">12 months</option><option value="24">24 months</option></select></label></div><button className="button dark" type="button">Send offer</button></div>}
        <form className="viewing-form" onSubmit={onViewing}>
          <div><span className="eyebrow">REQUEST A VIEWING</span><h3>{viewingSent ? "Request sent" : "Share the basics once"}</h3></div>
          {viewingSent ? <p>The lister will confirm a slot in chat. No payment is needed to secure a viewing.</p> : <><div className="form-grid"><label>Move-in date<input type="date" defaultValue="2026-09-01" required /></label><label>Lease length<select defaultValue="24"><option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option></select></label><label>Occupants<select defaultValue="2"><option>1</option><option>2</option><option>3</option><option>4+</option></select></label><label>Status<select defaultValue="working"><option value="working">Working in Singapore</option><option value="studying">Studying in Singapore</option><option value="local">Citizen / PR</option></select></label></div><button className="button dark" type="submit">Request viewing →</button></>}
        </form>
      </div>
    </div>
  );
}

function ListingFlow({
  step,
  photoNames,
  listingKind,
  listingArea,
  availability,
  askingRent,
  listingTitle,
  onPhotos,
  onGenerate,
  onStep,
  onKind,
  onArea,
  onAvailability,
  onRent,
  onTitle,
  onBrowse,
}: {
  step: ListingStep;
  photoNames: string[];
  listingKind: string;
  listingArea: string;
  availability: string;
  askingRent: number;
  listingTitle: string;
  onPhotos: (event: ChangeEvent<HTMLInputElement>) => void;
  onGenerate: () => void;
  onStep: (step: ListingStep) => void;
  onKind: (value: string) => void;
  onArea: (value: string) => void;
  onAvailability: (value: string) => void;
  onRent: (value: number) => void;
  onTitle: (value: string) => void;
  onBrowse: () => void;
}) {
  return (
    <div className="view list-view">
      <header className="flow-header"><div><span className="eyebrow">OWNER / AUTHORISED AGENT</span><h1>List a home</h1></div><div className="flow-steps"><span className={step !== "capture" ? "done" : "active"}>1</span><i /><span className={step === "draft" ? "active" : step === "preview" || step === "published" ? "done" : ""}>2</span><i /><span className={step === "preview" || step === "published" ? "active" : ""}>3</span></div></header>
      {step === "capture" && (
        <section className="capture-layout">
          <div className="capture-copy"><span className="pill">AI-ASSISTED</span><h2>Start with the space.<br />We’ll build the listing.</h2><p>Upload a few honest photos. LeaseKaki identifies the property details, drafts the copy and estimates a defensible rent range.</p><ul><li><span>1</span>Take or choose 6–10 photos</li><li><span>2</span>Confirm essential property details</li><li><span>3</span>Review before anything goes live</li></ul></div>
          <label className="camera-drop">
            <input type="file" accept="image/*" multiple onChange={onPhotos} />
            <span className="camera-target">◎</span>
            <strong>{photoNames.length ? `${photoNames.length} photos selected` : "Tap to add property photos"}</strong>
            <span>{photoNames.length ? photoNames.slice(0, 3).join(" · ") : "Camera or photo library"}</span>
            <em>Choose photos</em>
          </label>
          <button className="button coral wide" type="button" onClick={onGenerate}>Generate AI draft →</button>
          <p className="privacy-note">Photos stay private until you approve and publish the listing.</p>
        </section>
      )}
      {step === "draft" && (
        <section className="draft-layout">
          <div className="draft-main">
            <span className="pill success">AI DRAFT READY</span><h2>We found the essentials.</h2><p>Confirm these details. Different rules will appear automatically for rooms, HDB and private homes.</p>
            <div className="field-stack"><label>Listing title<input value={listingTitle} onChange={(event) => onTitle(event.target.value)} /></label><label>Property type<select value={listingKind} onChange={(event) => onKind(event.target.value)}><option>Whole HDB unit</option><option>HDB room</option><option>Private whole unit</option><option>Private room</option></select></label><label>Project or estate<input value={listingArea} onChange={(event) => onArea(event.target.value)} /></label><label>Available from<input type="date" value={availability} onChange={(event) => onAvailability(event.target.value)} /></label></div>
          </div>
          <aside className="rent-card"><span className="eyebrow light">SUGGESTED ASKING RENT</span><strong>$3,650–$3,900</strong><span className="confidence dark">Medium confidence</span><div className="rent-slider"><span /></div><label>Your asking rent<input type="number" value={askingRent} onChange={(event) => onRent(Number(event.target.value))} /></label><div className="evidence-list"><span><b>HDB town median</b><strong>$3,600</strong></span><span><b>Nearby range</b><strong>$3,550–$3,900</strong></span><span><b>Furnishing adjustment</b><strong>+$100</strong></span></div><p>Illustrative data explanation for this prototype. Production estimates will cite source period and comparable count.</p></aside>
          <div className="flow-actions"><button className="button secondary" type="button" onClick={() => onStep("capture")}>Back</button><button className="button dark" type="button" onClick={() => onStep("preview")}>Preview listing →</button></div>
        </section>
      )}
      {step === "preview" && (
        <section className="preview-layout">
          <div className="preview-banner"><span className="pill">PRIVATE PREVIEW</span><h2>This is what renters will see.</h2><p>Exact unit details remain hidden until you accept a viewing request.</p></div>
          <div className="preview-card"><div className="property-image sunset"><span className="property-shape large"><i /><i /><i /></span><span className="lister-badge">Owner</span></div><div className="preview-copy"><div className="listing-topline"><strong>${askingRent.toLocaleString()}<small>/mo</small></strong><span>HDB</span></div><h3>{listingTitle}</h3><p>{listingArea} · {listingKind} · Available 1 Sep</p><p>Bright, breezy home with a practical layout, furnished living spaces and an easy walk to transport and daily amenities.</p><div className="preview-checks"><span>✓ Location protected</span><span>✓ Rent evidence shown</span><span>✓ Enquiries stay in-app</span></div></div></div>
          <div className="flow-actions"><button className="button secondary" type="button" onClick={() => onStep("draft")}>Edit draft</button><button className="button coral" type="button" onClick={() => onStep("published")}>Publish listing →</button></div>
        </section>
      )}
      {step === "published" && (
        <section className="success-view"><span className="success-mark">✓</span><span className="eyebrow">LISTING PUBLISHED</span><h2>Your home is live.</h2><p>Renters can now discover the listing, chat and request a viewing. You remain in control of every next step.</p><div className="success-stats"><span><strong>&lt; 60 sec</strong>Target draft time</span><span><strong>$0</strong>Pilot listing fee</span><span><strong>Protected</strong>Exact unit</span></div><div className="flow-actions"><button className="button secondary" type="button" onClick={() => onStep("capture")}>List another</button><button className="button dark" type="button" onClick={onBrowse}>View marketplace →</button></div></section>
      )}
    </div>
  );
}

function DealsView({ agreementOpen, onAgreement }: { agreementOpen: boolean; onAgreement: () => void }) {
  return (
    <div className="view deals-view">
      <header className="deal-hero"><span className="eyebrow light">ACTIVE RENTAL</span><h1>Everything after “yes”.</h1><p>Both parties see the same agreed terms, next action and deadline.</p></header>
      <div className="deal-layout">
        <section className="deal-summary"><div className="deal-property"><div className="mini-property sunset"><span className="property-shape"><i /><i /><i /></span></div><div><span className="status-pill">Offer accepted</span><h2>Bishan Street 13</h2><p>$3,700/month · 24 months · starts 1 Sep 2026</p></div></div><div className="progress-label"><span>Transaction progress</span><strong>64%</strong></div><div className="deal-progress"><span /></div><p>Three steps remain before the tenancy is ready for handover.</p></section>
        <section className="deal-timeline"><DealStep status="done" number="1" title="Viewing completed" meta="17 Jul · 7:00 PM" /><DealStep status="done" number="2" title="Offer accepted" meta="$3,700 · 24 months · 2 occupants" /><div className="deal-step active"><span className="step-number">3</span><div><span className="eyebrow">YOUR ACTION</span><h3>Review tenancy agreement</h3><p>LeaseKaki populated the CEA template from both parties’ confirmed answers.</p><button className="button coral" type="button" onClick={onAgreement}>{agreementOpen ? "Close preview" : "Review agreement →"}</button>{agreementOpen && <div className="agreement-preview"><div><strong>Tenancy Agreement</strong><span>Private draft · Version 1</span></div><p><b>Landlord:</b> Alex Tan</p><p><b>Tenant:</b> Jamie Lim</p><p><b>Premises:</b> Bishan Street 13, exact unit protected</p><p><b>Term:</b> 1 Sep 2026 to 31 Aug 2028</p><p><b>Rent:</b> $3,700 per calendar month</p><label><input type="checkbox" /> I have reviewed the confirmed commercial terms.</label><button className="button dark wide" type="button">Proceed to sign</button></div>}</div></div><DealStep status="locked" number="4" title="Sign agreement" meta="Draw or type signature with audit trail" /><DealStep status="locked" number="5" title="Stamp with IRAS" meta="Guided checklist after signing" /></section>
        <aside className="deal-side"><span className="eyebrow">SHARED DEAL ROOM</span><h3>Alex ↔ Jamie</h3><div className="deal-message"><span className="avatar small">AL</span><p>I've confirmed the agreed repair clause. Ready for your review.</p></div><div className="deal-message mine"><span className="avatar small">JL</span><p>Thanks—I'll review the agreement tonight.</p></div><div className="message-input"><input placeholder="Message both parties" /><button type="button">Send</button></div><p className="safe-note">Payments go directly to the property owner, never through LeaseKaki.</p></aside>
      </div>
    </div>
  );
}

function DealStep({ status, number, title, meta }: { status: "done" | "locked"; number: string; title: string; meta: string }) {
  return <div className={`deal-step ${status}`}><span className="step-number">{status === "done" ? "✓" : number}</span><div><h3>{title}</h3><p>{meta}</p></div><span className="step-tail">{status === "locked" ? "⌁" : "Done"}</span></div>;
}
