import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onSubscribe }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handlePayment = () => {
    setLoading(true);
    // Simulate payment processing delay
    setTimeout(() => {
      setLoading(false);
      onSubscribe();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-white/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white max-w-sm w-full border border-black relative p-8 flex flex-col items-center text-center shadow-sm">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-50 transition-colors"
        >
            <X size={20} className="text-black" strokeWidth={1.5} />
        </button>

        <h2 className="text-xl font-normal mb-3 mt-2 text-black tracking-tight">Limit reached</h2>
        <p className="text-gray-500 text-sm mb-8 font-light leading-relaxed">
            You have used your free trial generation.<br/>
            Purchase more credits to continue.
        </p>

        <div className="w-full mb-8 border-y border-black py-6">
            <div className="flex justify-between items-center mb-1">
                <span className="text-base font-normal">10 Generations</span>
                <span className="text-base font-normal">10.00€</span>
            </div>
            <div className="text-xs text-gray-400 font-light text-left">
                1.00€ per generation
            </div>
        </div>

        <button 
            onClick={handlePayment}
            disabled={loading}
            className="w-full py-3.5 bg-black text-white text-sm font-normal hover:bg-white hover:text-black border border-black transition-all flex items-center justify-center gap-2"
        >
            {loading ? (
                <span>Processing...</span>
            ) : (
                <span>Pay 10.00€</span>
            )}
        </button>
        
        <p className="text-[10px] text-gray-400 mt-4 flex items-center gap-1.5 font-light opacity-60">
            <Lock size={10} strokeWidth={1.5} /> Secure payment
        </p>
      </div>
    </div>
  );
};

export default SubscriptionModal;