'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from './components/orderModal';

interface TradeResponse {
  id: number;
  purchase_price: number;
  purchase_money: number;
  purchase_amount: number;
  profit: number;
  timestamp: string;
}

interface trade {
  id: number;
  purchasePrice: number;
  purchaseMoney: number;
  purchaseAmount: number;
  profit: number;
  timestamp: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

const convertTrade = (res: TradeResponse): trade => ({
  id: res.id,
  purchasePrice: res.purchase_price,
  purchaseMoney: res.purchase_money,
  purchaseAmount: res.purchase_amount,
  profit: res.profit,
  timestamp: new Date(res.timestamp).getTime(),
});

type TradeListProps = {
  trades: trade[];
  currentPrice: number;
};

const INITIAL_POINTS = [
  92944, 92650, 92410, 91980, 91420, 90810, 90110, 91050, 91890, 91662,
];
const CHART_WIDTH = 300;
const CHART_HEIGHT = 120;
const CHART_PADDING = 12;

export default function Home() {
  const [points, setPoints] = useState<number[]>(INITIAL_POINTS);
  const [isRunning, setIsRunning] = useState(false);
  const [isOpenOrderModal, setIsOpenOrderModal] = useState(false);
  const [trades, setTrades] = useState<trade[]>([]);
  const [money, setMoney] = useState(100000);
  const [userId, setUserId] = useState<number | null>(null);

  const currentPrice = points[points.length - 1];
  const openingPrice = points[0];
  const delta = currentPrice - openingPrice;
  const deltaPercent = (delta / openingPrice) * 100;

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users`, {
          headers: {
            accept: 'application/json',
          },
        });
        if (!res.ok) {
          throw new Error('Failed to fetch users');
        }
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          throw new Error('サーバーからJSONが返されませんでした');
        }
        const users: { id: number; balance: number }[] = await res.json();
        if (users.length > 0) {
          setUserId(users[0].id);
          setMoney(users[0].balance);
        } else {
          const createRes = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              user: { balance: 1000000 },
            }),
          });
          if (!createRes.ok) {
            throw new Error('Failed to create user');
          }
          const newUser: { id: number; balance: number } =
            await createRes.json();
          setUserId(newUser.id);
          setMoney(newUser.balance);
        }
      } catch (error) {
        console.error('ユーザーの初期化に失敗しました', error);
      }
    };
    const fetchPrices = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/prices`, {
          headers: {
            Accept: 'application/json',
          },
        });
        if (!res.ok) {
          throw new Error('Failed to fetch prices');
        }
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          throw new Error('サーバーからJSONが返されませんでした');
        }

        const data: { id: number; price: number; timestamp: string }[] =
          await res.json();

        if (data.length > 0) {
          const prices = data.reverse().map((p) => p.price);
          setPoints(prices);
        }
      } catch (error) {
        console.error('価格の取得に失敗しました', error);
      }
    };
    initializeUser();
    fetchPrices();
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }
    const fetchTrades = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/${userId}/trades`, {
          headers: {
            Accept: 'application/json',
          },
        });
        const contentType = res.headers.get('content-type') ?? '';
        if (!res.ok) {
          const errorText = contentType.includes('application/json')
            ? await res.json()
            : await res.text();
          throw new Error(
            typeof errorText === 'string'
              ? errorText
              : errorText.error || `HTTP ${res.status}`,
          );
        }

        if (!contentType.includes('application/json')) {
          const html = await res.text();
          console.error(
            'JSONではなくHTMLが返されました。',
            html.substring(0, 200),
          );
          throw new Error('JSONではなくHTMLが返されました');
        }
        const data: TradeResponse[] = await res.json();
        setTrades(data.map(convertTrade));
      } catch (error) {
        console.error('取引履歴の取得に失敗しました。', error);
      }
    };
    fetchTrades();
  }, [userId]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = setInterval(async () => {
      setPoints((prev) => {
        const last = prev[prev.length - 1];
        const movement = (Math.random() - 0.5) * 1500;
        const next = last + movement;
        const newPrice = Math.round(next);

        fetch(`${API_BASE_URL}/prices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            price: {
              price: newPrice,
              timestamp: new Date().toISOString(),
            },
          }),
        }).catch((error) => {
          console.error('価格の保存に失敗しました', error);
        });

        return [...prev.slice(1), newPrice];
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const getX = (index: number) =>
    (index / (points.length - 1)) * (CHART_WIDTH - CHART_PADDING * 2) +
    CHART_PADDING;

  const getY = (value: number) =>
    CHART_HEIGHT -
    CHART_PADDING -
    ((value - min) / range) * (CHART_HEIGHT - CHART_PADDING * 2);

  const path = useMemo(() => {
    return points
      .map((value, index) => {
        const x = getX(index);
        const y = getY(value);
        return `${index === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');
  }, [points, min, range]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    // 好きな形式に変更してOK
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
  };

  const calcProfit = (t: trade, currentPrice: number) => {
    return Math.round((currentPrice - t.purchasePrice) * t.purchaseAmount);
  };
  const totalProfit = trades.reduce(
    (sum, t) => sum + calcProfit(t, currentPrice),
    0,
  );

  const handleConfirm = async (t: trade) => {
    if (!userId) {
      alert('ユーザーIDが設定されていません');
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/users/${userId}/trades/${t.id}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
          },
        },
      );
      const contentType = res.headers.get('content-type') ?? '';

      if (!res.ok) {
        const errorText = contentType.includes('application/json')
          ? await res.json()
          : await res.text();
        throw new Error(
          typeof errorText === 'string'
            ? errorText
            : errorText.error || `HTTP ${res.status}`,
        );
      }
      setMoney((prev) => prev + calcProfit(t, currentPrice));
      setTrades((prev) => prev.filter((x) => x.id !== t.id));
    } catch (error) {
      console.error('取引の削除に失敗しました', error);
      alert(
        error instanceof Error
          ? `取引の削除に失敗しました': ${error.message}`
          : '取引の削除に失敗しました',
      );
    }
  };

  const areaPath = `${path} L${getX(points.length - 1)},${
    CHART_HEIGHT - CHART_PADDING
  } L${getX(0)},${CHART_HEIGHT - CHART_PADDING} Z`;

  return (
    <div>
      <div className="flex flex-col items-center">
        <header className="w-full bg-gray-900 text-white py-6 shadow-md">
          <h1 className="text-center text-3xl font-semibold tracking-wide">
            投資シミュレータ
          </h1>
        </header>
      </div>
      <section className="mx-auto mt-8 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xl text-center font-bold">モンダコイン</p>

        <div className="mt-2 flex flex-col items-center text-center gap-1">
          <p className="text-3xl font-semibold">
            ¥{currentPrice.toLocaleString()}
          </p>
          <span
            className={`text-sm font-medium ${
              delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {delta >= 0 ? '+' : '-'}
            {Math.abs(delta).toLocaleString()} 円 ({deltaPercent.toFixed(2)}%)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsRunning((prev) => !prev)}
          className="mt-4 w-full rounded-full border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
        >
          {isRunning ? '値動きを停止する' : 'モンダコインの値動きを開始'}
        </button>

        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="mt-6 w-full text-emerald-500"
        >
          <defs>
            <linearGradient id="miniArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#miniArea)" />
          <path d={path} fill="none" stroke="#22c55e" strokeWidth="2" />
        </svg>
      </section>
      <div className="flex justify-evenly">
        <button
          className="bg-red-300 text-white p-2 rounded-md mt-4"
          onClick={() => setIsOpenOrderModal(true)}
        >
          買う
        </button>
        <button
          className="bg-blue-300 text-white p-2 rounded-md mt-4"
          onClick={() => setIsOpenOrderModal(true)}
        >
          売る
        </button>
      </div>
      <div className="text-center mt-4">
        残高:
        <div className="text-xl font-semibold">
          {money?.toLocaleString() ?? 0}円
        </div>
      </div>
      <div className="mt-6 max-w-lg mx-auto overflow-hiddden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
          取引履歴
        </div>
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                日時
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">
                購入価格
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                購入金額
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                利益
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {trades.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-600">
                  {formatDate(t.timestamp)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-800">
                  {t.purchasePrice.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-800">
                  {t.purchaseMoney.toLocaleString()}
                </td>
                <td
                  className={`px-3 py-2 text-right font-semibold ${
                    calcProfit(t, currentPrice) > 0
                      ? 'text-emerald-600'
                      : calcProfit(t, currentPrice) < 0
                        ? 'text-rose-600'
                        : 'text-gray-500'
                  }`}
                >
                  {calcProfit(t, currentPrice) > 0 ? '+' : ''}
                  {calcProfit(t, currentPrice).toLocaleString()}
                </td>
                <td>
                  <button
                    onClick={() => handleConfirm(t)}
                    className="bg-blue-500 text-white text-xs p-2 ml-6 rounded-lg"
                  >
                    確定する
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td
                colSpan={3}
                className="px-3 py-2 text-right font-semibold text-gray-800"
              >
                合計利益
              </td>
              <td
                className={`px-3 py-2 text-right font-semibold ${
                  totalProfit > 0
                    ? 'text-emerald-600'
                    : totalProfit < 0
                      ? 'text-rose-600'
                      : 'text-gray-500'
                }`}
              >
                {totalProfit > 0 ? '+' : ''}
                {totalProfit.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Modal
        isOpenOrderModal={isOpenOrderModal}
        setIsOpenOrderModal={setIsOpenOrderModal}
        currentPrice={currentPrice}
        setTrades={setTrades}
        money={money}
        userId={userId ?? 0}
      />
    </div>
  );
}
