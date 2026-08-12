import { catInfo, friendlyDate } from '@/lib/reference';
import CategoryIcon from './CategoryIcon';
import Amount from './Amount';
import type { Txn } from '@/lib/repo';
import { displayMerchant } from '@/lib/merchantName';

export default function TxnRow({ t, onClick }: { t: Txn; onClick?: () => void }) {
  const ci = t.category ? catInfo(t.category) : null;

  return (
    <div onClick={onClick} className={`flex items-center gap-3 py-3 ${onClick ? 'cursor-pointer active:opacity-70' : ''}`}>
      <span className="w-10 h-10 rounded-full flex items-center justify-center flex-none border border-credline text-credink">
        <CategoryIcon id={t.category} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-body font-medium text-credink truncate">{displayMerchant(t.merchant)}</div>
        <div className="text-caption text-credmuted mt-0.5">{ci ? ci.label : t.status[0].toUpperCase() + t.status.slice(1)}</div>
      </div>
      <div className="text-right flex-none">
        <div className={t.direction === 'credit' ? 'text-credgreen' : 'text-credink'}>
          <Amount value={t.amount} size="sm" sign={t.direction === 'credit'} />
        </div>
        <div className="text-caption text-credmuted mt-0.5">{friendlyDate(t.date, true)}</div>
      </div>
    </div>
  );
}
