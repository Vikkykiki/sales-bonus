/**
 * Функция для расчета выручки
 * @param purchase - запись о покупке
 * @param product - карточка товара
 * @returns {number} выручка после скидки
 */
function calculateSimpleRevenue(purchase, product) {
    // @TODO: Расчет выручки от операции
    const { sale_price, quantity, discount } = purchase;
    const fullPrice = sale_price * quantity;
    const discountAmount = fullPrice * (discount / 100);
    return fullPrice - discountAmount;
}

/**
 * Функция для расчета бонусов
 * @param index - порядковый номер в отсортированном массиве
 * @param total - общее число продавцов
 * @param seller карточка продавца
 * @returns {number} процент бонуса (15, 10, 5, 0)
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return 15;
    else if (index === 1 || index === 2) return 10;
    else if (index === total - 1) return 0;
    else return 5;
}

/**
 * Функция анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    const { calculateRevenue, calculateBonus } = options;

    if (!data || !Array.isArray(data.purchase_records) || !Array.isArray(data.sellers) || !Array.isArray(data.products)) {
        throw new Error("Invalid data structure");
    }

    // Индексация
    const sellersIndex = Object.fromEntries(
        data.sellers.map(s => [s.id, s])
    );
    const productsIndex = Object.fromEntries(
        data.products.map(p => [p.sku, p])
    );

    // Статистика
    const stats = {};
    data.sellers.forEach(seller => {
        stats[seller.id] = {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {}
        };
    });

    // Сбор данных
    data.purchase_records.forEach(record => {
        const sellerStats = stats[record.seller_id];
        if (!sellerStats) return;

        record.items.forEach(item => {
            const product = productsIndex[item.sku];
            if (!product) return; // Защита

            const revenue = calculateRevenue(item, product);
            sellerStats.revenue += revenue;

            const cost = product.cost || 0;
            const costTotal = cost * item.quantity;
            sellerStats.profit += revenue - costTotal;

            sellerStats.sales_count += item.quantity;

            sellerStats.products_sold[item.sku] = (sellerStats.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Сортируем по прибыли
    const resultArray = Object.values(stats);
    resultArray.sort((a, b) => b.profit - a.profit);

    const total = resultArray.length;

    // Формирование результата
    return resultArray.map((seller, index) => {
        // Топ-10 товаров (с детерминированной сортировкой)
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity || a.sku.localeCompare(b.sku))
            .slice(0, 10);

        // Бонус в рублях
        const bonusPercent = calculateBonus(index, total, seller);
        const bonusAmount = bonusPercent === 0 ? 0 : Number((seller.profit * bonusPercent / 100).toFixed(2));

        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: Number(seller.revenue.toFixed(2)),
            profit: Number(seller.profit.toFixed(2)),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: bonusAmount
        };
    });
}