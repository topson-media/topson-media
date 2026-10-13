import React, { useState } from 'react';
import { Send, CheckCircle2, Sparkles, Mail } from 'lucide-react';
import { EmailMessage } from '../types';
import { addContactSubmissionToDb } from '../services/firebase';
import { useLanguage } from '../context/LanguageContext';

interface ContactSectionProps {
  onJumpToChat?: () => void;
  onSendMessageToAdmin?: (message: EmailMessage) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ onJumpToChat, onSendMessageToAdmin }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Question & Tutorial Request');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedName, setLastSubmittedName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim() || !email.trim() || !message.trim() || isSubmitting) return;

    // Retain current scroll position strictly to prevent any erratic page jumping
    const lockedScrollY = window.scrollY;
    setIsSubmitting(true);
    const submittedName = name.trim();
    setLastSubmittedName(submittedName);

    try {
      // 1. Route and save directly into Firebase Firestore collection 'contact_submissions'
      const newSubmission = await addContactSubmissionToDb({
        senderName: submittedName,
        senderEmail: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });

      // 2. Notify parent state so Admin Dashboard can see the submission instantly
      if (onSendMessageToAdmin) {
        onSendMessageToAdmin(newSubmission);
      }

      // 3. Clear inputs smoothly and show neon-orange success alert
      setName('');
      setEmail('');
      setMessage('');
      setSent(true);

      // Lock scroll position strictly on current viewport
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - lockedScrollY) > 20) {
          window.scrollTo({ top: lockedScrollY, behavior: 'instant' as ScrollBehavior });
        }
      });

      setTimeout(() => {
        setSent(false);
      }, 7000);
    } catch (err) {
      console.error('Contact submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="contact-form"
      className="py-6 sm:py-16 md:py-20 w-full flex flex-col justify-center border-t border-neutral-200 bg-white scroll-mt-20 relative px-3 sm:px-6 lg:px-8"
    >
      <div className="max-w-3xl mx-auto w-full">
        {/* Clean Kicker */}
        <div className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-neutral-500 mb-0.5 sm:mb-1 text-center">
          {t.contactSection.kicker}
        </div>

        {/* Section Title */}
        <div className="text-center mb-3 sm:mb-8">
          <h2 className="text-xl sm:text-3xl font-black text-neutral-900 tracking-tight leading-tight flex items-center justify-center gap-2">
            <span>{t.contactSection.header}</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </h2>
          <p className="hidden sm:block text-xs sm:text-sm text-neutral-600 mt-1.5 max-w-lg mx-auto font-medium">
            {t.contactSection.subtext}
          </p>
        </div>

        {/* Full-width dynamic card template */}
        <div className="rounded-xl sm:rounded-3xl p-3.5 sm:p-8 bg-white border border-neutral-200 shadow-xs sm:shadow-sm relative">
          {/* Sleek Neon-Orange Success Alert Banner */}
          {sent && (
            <div className="mb-3 sm:mb-5 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-600/15 border-2 border-orange-500 text-neutral-900 shadow-[0_0_25px_rgba(249,115,22,0.3)] flex items-center gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-neutral-900 flex items-center gap-2">
                  <span>{t.contactSection.messageSentSuccess}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[8px] sm:text-[9px] font-extrabold uppercase">
                    {t.contactSection.deliveredBadge}
                  </span>
                </h4>
                <p className="text-[10px] sm:text-[11px] text-neutral-700 mt-0.5 font-medium leading-tight truncate">
                  Thank you{lastSubmittedName ? `, ${lastSubmittedName}` : ''}! Topson will reply directly to your inbox.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-4">
            {/* Name and Email 2-column input row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-neutral-800 mb-1 sm:mb-1.5">
                  {t.contactSection.fullName}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full h-9 sm:h-11 px-3 sm:px-3.5 text-xs sm:text-sm rounded-lg sm:rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-neutral-800 mb-1 sm:mb-1.5">
                  {t.contactSection.emailAddress}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full h-9 sm:h-11 px-3 sm:px-3.5 text-xs sm:text-sm rounded-lg sm:rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Subject Category Select */}
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-neutral-800 mb-1 sm:mb-1.5">
                {t.contactSection.subjectTopic}
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-9 sm:h-11 px-3 sm:px-3.5 text-xs sm:text-sm rounded-lg sm:rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs cursor-pointer"
              >
                <option value="Question & Tutorial Request">Question & Tutorial Request</option>
                <option value="Phone Optimization Help">Phone Optimization Help (Android / iPhone)</option>
                <option value="PC & Laptop Troubleshooting">PC & Laptop Troubleshooting (Windows / Mac)</option>
                <option value="Collaboration & Sponsorship">Collaboration & Sponsorship</option>
                <option value="Other Inquiries">Other Inquiries</option>
              </select>
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-neutral-800 mb-1 sm:mb-1.5">
                {t.contactSection.messageQuestion}
              </label>
              <textarea
                required
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your tech issue or tutorial request..."
                className="w-full min-h-[64px] sm:min-h-[120px] p-2 sm:p-3 text-xs sm:text-sm rounded-lg sm:rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs resize-none"
              />
            </div>

            <div className="pt-1 sm:pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 sm:h-12 px-5 sm:px-7 py-2 sm:py-3 text-xs sm:text-sm font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg sm:rounded-xl transition-all shadow-sm active:scale-98 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t.contactSection.sendEmailBtn}</span>
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                  </>
                )}
              </button>

              <div className="text-[10px] sm:text-[11px] text-neutral-500 font-medium text-center sm:text-left flex items-center justify-center sm:justify-start gap-1.5">
                <span>Directly sent to:</span>
                <a
                  href="mailto:topsonkenedy@gmail.com"
                  className="font-bold text-orange-600 hover:underline inline-flex items-center gap-1"
                  title="Send email to Topson Media"
                >
                  <span>mail topson media</span>
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

