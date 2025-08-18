/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции

  //   const discount = 1 - purchase.discount / 100;
  //   return (purchase.sale_price * purchase.quantity * discount);

  // purchase — это одна из записей в поле items из чека в data.purchase_records
  // _product — это продукт из коллекции data.products
  const { discount, sale_price, quantity } = purchase;
  const decDiscount = discount / 100;
  const totalPrise = sale_price * quantity;
  const totalWithDiscount = totalPrise * (1 - decDiscount);
  return totalWithDiscount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  let bonusPercent;
  if (index === 0) {
    bonusPercent = 15;
  } else if (index === 1 || index === 2) {
    bonusPercent = 10;
  } else if (index === total - 1) {
    bonusPercent = 0;
  } else {
    // Для всех остальных
    bonusPercent = 5;
  }
  return (seller.profit * bonusPercent) / 100;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  // @TODO: Проверка наличия опций
  if (typeof options !== "object" || options === null) {
    throw new Error("Некорректные опции");
  }

  const { calculateRevenue, calculateBonus } = options; // Сюда передадим функции для расчётов

  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error(
      "В опциях должны быть функции calculateRevenue и calculateBonus"
    );
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => ({
    seller_id: seller.id, // Приводим к нужному ключу
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
    bonus: 0,
    top_products: [],
  }));

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = Object.fromEntries(
    sellerStats.map((item) => [item.seller_id, item])
  );
  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product])
  );

  // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach((record) => {
      const seller = sellerIndex[record.seller_id];
      if (!seller) {
        throw new Error(`Продавец с ID ${record.seller_id} не найден`);
      }

      seller.sales_count += 1;

      record.items.forEach((item) => {
        const product = productIndex[item.sku];
        if (!product) {
          throw new Error(`Товар с SKU ${item.sku} не найден`);
        }

        const revenue = calculateRevenue(item, product);
        const cost = product.purchase_price * item.quantity;
        const profit = revenue - cost;

        seller.revenue = Math.round((seller.revenue + revenue) * 100) / 100;
        seller.profit = Math.round((seller.profit + profit) * 100) / 100;

        if (!seller.products_sold[item.sku]) {
          seller.products_sold[item.sku] = 0;
        }
        seller.products_sold[item.sku] += item.quantity;
      });
    });

  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller); // Считаем бонус
    seller.top_products = Object.entries(seller.products_sold) // Формируем топ-10 товаров
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}