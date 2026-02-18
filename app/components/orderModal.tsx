import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

type Trade = {
  id: number;
  purchasePrice: number;
  purchaseMoney: number;
  purchaseAmount: number;
  profit: number;
  timestamp: number;
};

type Props = {
  isOpenOrderModal: boolean;
  setIsOpenOrderModal: Dispatch<SetStateAction<boolean>>;
  currentPrice: number;
  setTrades: Dispatch<SetStateAction<Trade[]>>;
  money: number;
  userId: number;
};

const API_BASE_URL = 'http://localhost:3001';

export default function Modal({
  isOpenOrderModal,
  setIsOpenOrderModal,
  currentPrice,
  setTrades,
  money,
  userId,
}: Props) {
  if (!isOpenOrderModal) return null;

  const handleClose = () => setIsOpenOrderModal(false);
  const [purchaseMoneyInput, setPurchaseMoneyInput] = useState<number | ''>(''); // ★ input 用s
  const [error, setError] = useState<string | null>(null); // ★ エラーメッセージ用

  const handlePurchase = async () => {
    if (typeof purchaseMoneyInput === 'number') {
      if (purchaseMoneyInput > money) {
        setError('残高を超える金額は指定できません。');
        return; // ここで処理中断
      }

      try {
        const res = await fetch(`${API_BASE_URL}/users/${userId}/trades`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trade: {
              purchase_price: currentPrice,
              purchase_money: purchaseMoneyInput,
              purchase_amount: purchaseMoneyInput / currentPrice,
              profit: 0,
              timestamp: new Date().toISOString(),
            },
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create trade');
        }

        const savedTrade = await res.json();

        const newTrade: Trade = {
          id: savedTrade.id,
          purchasePrice: currentPrice,
          purchaseMoney: purchaseMoneyInput,
          purchaseAmount: purchaseMoneyInput / currentPrice,
          profit: 0,
          timestamp: new Date(savedTrade.timestamp).getTime(),
        };

        setTrades((prev) => [...prev, newTrade]);
        setPurchaseMoneyInput('');
        handleClose();
      } catch (error) {
        console.error('取引の作成に失敗しました', error);
        setError(
          error instanceof Error ? error.message : '取引の作成に失敗しました'
        );
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-semibold">モンダコインを購入</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <p>購入金額</p>
          <input
            type="number"
            className="w-full rounded-md border border-gray-300 p-2"
            value={purchaseMoneyInput}
            onChange={(e) => {
              setError(null);
              setPurchaseMoneyInput(
                e.target.value === '' ? '' : Number(e.target.value)
              );
            }}
          />
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            onClick={handlePurchase}
          >
            購入する（ダミー）
          </button>
        </div>
      </div>
    </div>
  );
}
