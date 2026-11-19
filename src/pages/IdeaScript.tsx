import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Loader2, Save, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { workspaceRows } from '@/lib/workspaceData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { ContentIdea, IdeaStatus } from '@/types';
import { scriptSections, ideaStatuses } from '@/lib/ideaScript';
import { toast } from 'sonner';
import './IdeaScript.css';

type ScriptForm = Pick<ContentIdea, 'title' | 'status' | 'source_url' | 'notes' | 'script_hook' | 'script_body' | 'script_cta'>;

const emptyForm: ScriptForm = {
  title: '',
  status: 'Idea',
  source_url: '',
  notes: '',
  script_hook: '',
  script_body: '',
  script_cta: '',
};

export default function IdeaScript() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuth();
  const [form, setForm] = useState<ScriptForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setNotFound(false);
      try {
        if (!isSupabaseConfigured()) {
          const saved = JSON.parse(localStorage.getItem('content_circle_ideas') || '[]') as ContentIdea[];
          const idea = saved.find(item => item.id === id);
          if (!idea) throw new Error('missing');
          if (cancelled) return;
          setForm({ ...emptyForm, ...idea });
        } else {
          const { data, error } = await workspaceRows('content_ideas', user?.id)
            .eq('id', id)
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new Error('missing');
          if (cancelled) return;
          setForm({ ...emptyForm, ...data });
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id, user?.id, isDemoMode]);

  const update = (patch: Partial<ScriptForm>) => {
    setForm(previous => ({ ...previous, ...patch }));
    setDirty(true);
  };

  const save = async () => {
    if (!id || !form.title.trim()) {
      toast.error('Add a title before saving');
      return;
    }

    setSaving(true);
    try {
      if (!isSupabaseConfigured()) {
        const saved = JSON.parse(localStorage.getItem('content_circle_ideas') || '[]') as ContentIdea[];
        localStorage.setItem('content_circle_ideas', JSON.stringify(
          saved.map(item => item.id === id ? { ...item, ...form } : item)
        ));
      } else {
        const { error } = await supabase
          .from('content_ideas')
          .update({
            title: form.title.trim(),
            status: form.status,
            source_url: form.source_url,
            notes: form.notes,
            script_hook: form.script_hook || '',
            script_body: form.script_body || '',
            script_cta: form.script_cta || '',
          })
          .eq('id', id);
        if (error) throw error;
      }

      setForm(previous => ({ ...previous, title: previous.title.trim() }));
      setDirty(false);
      toast.success('Script saved');
    } catch (error: any) {
      toast.error(error?.message || 'Could not save this script');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (!saving) save();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(
        scriptSections.map(section => `${section.title}\n${form[section.key] || ''}`).join('\n\n')
      );
      toast.success('Script copied');
    } catch {
      toast.error('Could not copy the script');
    }
  };

  const written = scriptSections.filter(section => (form[section.key] || '').trim()).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500">
        <Loader2 className="w-5 h-5 mr-2 animate-spin text-orange-500" />
        Loading script…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-md mx-auto text-center py-24">
        <h2 className="text-2xl font-semibold text-white">Idea not found</h2>
        <p className="text-zinc-400 mt-2">It may have been deleted, or it belongs to another workspace.</p>
        <Link to="/ideas" className="inline-flex items-center gap-2 mt-6 text-orange-400 hover:text-orange-300">
          <ArrowLeft className="w-4 h-4" /> Back to ideas
        </Link>
      </div>
    );
  }

  return (
    <div className="idea-script-page">
      <header className="idea-script-page-head">
        <div className="idea-script-page-heading">
          <Link to="/ideas" className="idea-script-page-back">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to ideas
          </Link>
          <input
            aria-label="Idea title"
            className="idea-script-page-title"
            value={form.title}
            placeholder="Untitled idea"
            onChange={event => update({ title: event.target.value })}
          />
          <div className="idea-script-page-meta">
            <label className="idea-script-page-status" htmlFor="idea-status">Status</label>
            <select
              id="idea-status"
              className="idea-script-page-select"
              value={form.status}
              onChange={event => update({ status: event.target.value as IdeaStatus })}
            >
              {ideaStatuses.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
            <span className="idea-script-page-written">{written} of 3 blocks written</span>
            <span className={dirty ? 'idea-script-page-dirty' : 'idea-script-page-clean'}>
              {dirty ? 'Unsaved changes' : 'All changes saved'}
            </span>
          </div>
        </div>

        <div className="idea-script-page-actions">
          <Button type="button" variant="ghost" onClick={copyScript}>
            <Copy className="w-4 h-4 mr-2" /> Copy
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Saving…' : 'Save script'}
          </Button>
        </div>
      </header>

      <div className="idea-script idea-script-page-blocks">
        {scriptSections.map(section => (
          <section key={section.key} className={`idea-script-section idea-script-${section.tone}`}>
            <span className="idea-script-watermark" aria-hidden="true">{section.title}</span>
            <div className="idea-script-head">
              <label htmlFor={section.key} className="idea-script-label">{section.title}</label>
              <p className="idea-script-hint">{section.description}</p>
            </div>
            <div className="idea-script-ruled">
              <textarea
                id={section.key}
                dir="auto"
                rows={4}
                value={form[section.key] || ''}
                placeholder={section.placeholder}
                onChange={event => update({ [section.key]: event.target.value })}
              />
            </div>
          </section>
        ))}
      </div>

      <footer className="idea-script-page-footer">
        <Button type="button" variant="outline" onClick={() => navigate('/ideas')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to ideas
        </Button>
        <div className="idea-script-page-footer-actions">
          {form.source_url && (
            <a
              href={form.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="idea-script-page-source"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open source
            </a>
          )}
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Saving…' : 'Save script'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
