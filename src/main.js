/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет выручки от операции
    const { discount, sale_price, quantity } = purchase;
    const discountRate = discount / 100;
    const fullPrice = sale_price * quantity;
    return fullPrice * (1 - discountRate);
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
    if (index === 0) {
        // бонусы продавцам с наибольшей прибылью — 15%
        return 15;
    } else if (index === 1 || index === 2) {
        // бонусы продавцам на втором и третьем месте — 10%
        return 10;
    } else if (index === total - 1) {
        // для продавцов на последнем месте — 0%
        return 0;
    } else {
        // Остальные продавцы — 5%
        return 5;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data || !Array.isArray(data.purchase_records) || !Array.isArray(data.sellers) || !Array.isArray(data.products)) {
        throw new Error("Invalid data format: missing required arrays");
    }

    if (data.purchase_records.length === 0 || data.sellers.length === 0 || data.products.length === 0) {
        throw new Error("One or more data arrays are empty");
    }

    // @TODO: Проверка наличия опций
    if (!options || typeof options.calculateRevenue !== 'function' || typeof options.calculateBonus !== 'function') {
        throw new Error("Options must include calculateRevenue and calculateBonus functions");
    }

    const { calculateRevenue, calculateBonus } = options;

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = {};

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellersIndex = {};
    data.sellers.forEach(seller => {
        sellersIndex[seller.id] = seller;
        sellerStats[seller.id] = {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {}
        };
    });

    const productsIndex = {};
    data.products.forEach(product => {
        productsIndex[product.sku] = product;
    });

    // @TODO: Расчёт выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        const sellerId = record.seller_id;
        const stats = sellerStats[sellerId];

        if (!stats) return; // Продавец не найден

        record.items.forEach(item => {
            const revenue = calculateRevenue(item, productsIndex[item.sku]);
            stats.revenue += revenue;

            // Прибыль = выручка - себестоимость
            const product = productsIndex[item.sku];
            if (product) {
                const cost = product.cost || 0;
                const costTotal = cost * item.quantity;
                stats.profit += revenue - costTotal;
            }

            // Увеличиваем счётчик продаж
            stats.sales_count += item.quantity;

            // Увеличиваем количество по каждому SKU
            if (!stats.products_sold[item.sku]) {
                stats.products_sold[item.sku] = 0;
            }
            stats.products_sold[item.sku] += item.quantity;
        });
    });

    // Преобразуем объект статистики в массив
    const sellersArray = Object.values(sellerStats);

    // @TODO: Сортировка продавцов по прибыли (по убыванию)
    sellersArray.sort((a, b) => b.profit - a.profit);

    // @TODO: Назначение премий на основе ранжирования
    const totalSellers = sellersArray.length;
    sellersArray.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, totalSellers, seller);
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellersArray.map(seller => {
        let topProductSKU = '';
        let maxQuantity = 0;
        for (const sku in seller.products_sold) {
            if (seller.products_sold[sku] > maxQuantity) {
                maxQuantity = seller.products_sold[sku];
                topProductSKU = sku;
            }
        }

        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: Number(seller.revenue.toFixed(2)),
            profit: Number(seller.profit.toFixed(2)),
            sales_count: seller.sales_count,
            bonus: seller.bonus,
            top_products: topProductSKU ? [topProductSKU] : []
        };
    });
}
