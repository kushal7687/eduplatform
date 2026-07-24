"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Image as ImageIcon, Eye, EyeOff, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface HomeCard {
  id: string;
  key: string;
  title: string;
  section: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  route: string | null;
}

export function AdminHomeCards() {
  const [cards, setCards] = useState<HomeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<HomeCard | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/home-cards")
      .then((r) => r.json())
      .then((d) => setCards(d.cards || []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggleActive(card: HomeCard) {
    await fetch(`/api/admin/home-cards/${card.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !card.isActive }),
    });
    toast.success(card.isActive ? "Card hidden" : "Card shown");
    load();
  }

  async function deleteCard(card: HomeCard) {
    if (!confirm(`Delete "${card.title}"?`)) return;
    await fetch(`/api/admin/home-cards/${card.id}`, { method: "DELETE" });
    toast.success("Card deleted");
    load();
  }

  const sections = ["test", "resources", "premium"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Home Cards</h1>
          <p className="text-sm text-muted-foreground mt-1">Edit the image cards on student app home screen.</p>
        </div>
        <Button onClick={() => { setEditingCard(null); setEditOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Add Card
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        sections.map((section) => {
          const sectionCards = cards.filter((c) => c.section === section);
          const sectionTitle = section === "test" ? "UBT TEST" : section === "resources" ? "RESOURCES" : "PREMIUM";
          return (
            <Card key={section}>
              <CardHeader>
                <CardTitle className="text-base">{sectionTitle} ({sectionCards.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sectionCards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No cards in this section.</p>
                ) : (
                  sectionCards.map((card) => (
                    <div key={card.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="h-16 w-16 rounded-md border bg-muted overflow-hidden shrink-0 relative">
                        {card.imageUrl ? (
                          <img src={card.imageUrl} alt={card.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full grid place-items-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">{card.title}</div>
                          {!card.isActive && <Badge variant="outline" className="text-amber-600">Hidden</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          Key: {card.key} • Route: {card.route || "—"} • Order: {card.sortOrder}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(card)}>
                          {card.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingCard(card); setEditOpen(true); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => deleteCard(card)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <CardEditDialog open={editOpen} onOpenChange={setEditOpen} card={editingCard} onSaved={load} />
    </div>
  );
}

function CardEditDialog({ open, onOpenChange, card, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; card: HomeCard | null; onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [section, setSection] = useState("test");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [route, setRoute] = useState("tests");
  const [key, setKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (card) {
      setTitle(card.title); setSection(card.section); setImageUrl(card.imageUrl || "");
      setSortOrder(card.sortOrder); setRoute(card.route || "tests"); setKey(card.key);
      setIsActive(card.isActive); setImagePreview(card.imageUrl || "");
    } else {
      setTitle(""); setSection("test"); setImageUrl(""); setSortOrder(0);
      setRoute("tests"); setKey(""); setIsActive(true); setImagePreview("");
    }
  }, [card, open]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "home-cards");
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) {
        const fullUrl = data.url.startsWith("http") ? data.url : `https://my-project-five-sepia.vercel.app${data.url}`;
        setImageUrl(fullUrl);
        setImagePreview(fullUrl);
        toast.success("Image uploaded to R2");
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (!title.trim()) { toast.error("Title required"); return; }
    if (!key.trim()) { toast.error("Key required"); return; }
    setBusy(true);
    try {
      if (card) {
        const res = await fetch(`/api/admin/home-cards/${card.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, section, imageUrl, sortOrder, route, isActive }),
        });
        if (!res.ok) { const d = await res.json(); toast.error(d.error || "Failed"); return; }
        toast.success("Card updated");
      } else {
        const res = await fetch("/api/admin/home-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, title, section, imageUrl, sortOrder, route, isActive }),
        });
        if (!res.ok) { const d = await res.json(); toast.error(d.error || "Failed"); return; }
        toast.success("Card created");
      }
      onOpenChange(false);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{card ? "Edit Card" : "New Home Card"}</DialogTitle>
          <DialogDescription>Edit the image card shown on the student app home screen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!card && (
            <div>
              <Label>Key (unique identifier)</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} placeholder="ubt_test" disabled={!!card} />
            </div>
          )}
          <div>
            <Label>Title (shown on card)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="UBT TEST" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Section</Label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">UBT TEST</SelectItem>
                  <SelectItem value="resources">RESOURCES</SelectItem>
                  <SelectItem value="premium">PREMIUM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Route (app screen)</Label>
              <Select value={route} onValueChange={setRoute}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tests">Tests</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                  <SelectItem value="videos">Videos</SelectItem>
                  <SelectItem value="learn">Learn</SelectItem>
                  <SelectItem value="live">Live Class</SelectItem>
                  <SelectItem value="profile">Profile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Image upload section */}
          <div className="space-y-2">
            <Label>Card Image</Label>
            {imagePreview && (
              <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <Button size="sm" variant="destructive" className="absolute top-2 right-2 h-7 w-7 p-0" onClick={() => { setImageUrl(""); setImagePreview(""); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="mr-1 h-3 w-3" />
                {uploading ? "Uploading..." : "Upload Image to R2"}
              </Button>
            </div>
            <Input value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value); }} placeholder="Or paste image URL" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} min={0} />
            </div>
            <div>
              <Label>Active</Label>
              <Select value={isActive ? "yes" : "no"} onValueChange={(v) => setIsActive(v === "yes")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Active (visible)</SelectItem>
                  <SelectItem value="no">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : card ? "Update Card" : "Create Card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
