import { Request, Response, NextFunction } from "express";
import slugify from "slugify";
import Category from "../../models/Product/Category";
import ErrorHandler from "../../Utils/errorhandler";
import ResponseHandler from "../../Utils/resHandler";

export const addCategory = async (req: Request, res: Response, next: NextFunction) => {
    const { name, parent, level, orderNo } = req.body;

    const existing = await Category.findOne({ name, level, parent });

    if (existing) {
        return next(
            new ErrorHandler("Category name already exists at the same level.", 400)
        );
    }
    // Step 1: Generate unique slug
    let baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (await Category.findOne({ slug })) {
        slug = `${baseSlug}-${counter++}`;
    }

    // Step 2: Create category
    const categoryData = {
        name,
        slug,
        parent,
        level,
        orderNo
    };

    const newCategory = await Category.create(categoryData);
    ResponseHandler.send(res, "Category created successfully", newCategory, 201);
}

// Edit category details 
export const editCategory = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, parent, level, orderNo } = req.body;

    const category = await Category.findById(id);
    if (!category) {
        return next(new ErrorHandler("Category not found", 404));
    }

    const existing = await Category.findOne({
        _id: { $ne: id },
        name,
        level,
        parent: parent || null,
    });

    if (existing) {
        return next(
            new ErrorHandler("Another category with this name exists at the same level.", 400)
        );
    }

    // Update slug only if name has changed
    let slug = category.slug;
    if (category.name !== name) {
        let baseSlug = slugify(name, { lower: true, strict: true });
        slug = baseSlug;
        let counter = 1;
        while (await Category.findOne({ slug, _id: { $ne: id } })) {
            slug = `${baseSlug}-${counter++}`;
        }
    }
    // Update category fields
    category.name !== name && (category.name = name);
    category.slug !== slug && (category.slug = slug);
    category.parent !== parent && (category.parent = parent || null);
    category.level !== level && (category.level = level);
    category.orderNo !== orderNo && (category.orderNo = orderNo || 0);

    await category.save();

    ResponseHandler.send(res, "Category updated successfully", category, 200);
};

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
    const allCategories = await Category.find().lean();

    // Group categories by _id for fast lookup
    const byId: Record<string, any> = {};
    allCategories.forEach(cat => {
        byId[cat._id.toString()] = { ...cat, children: [] };
    });

    // Build tree structure
    const tree: Record<string, any> = {};

    for (const cat of allCategories) {
        if (cat.level === 0) {
            tree[cat.name] = {};
        }
    }

    for (const cat of allCategories) {
        if (cat.level === 1 && cat.parent) {
            const parent = byId[cat.parent.toString()];
            if (parent && parent.level === 0) {
                if (!tree[parent.name][cat.name]) {
                    tree[parent.name][cat.name] = [];
                }
            }
        }
    }

    for (const cat of allCategories) {
        if (cat.level === 2 && cat.parent) {
            const level1 = byId[cat.parent.toString()];
            const level0 = level1 && byId[level1.parent?.toString()];
            if (level1 && level0 && level0.level === 0 && level1.level === 1) {
                if (!tree[level0.name][level1.name]) {
                    tree[level0.name][level1.name] = [];
                }
                tree[level0.name][level1.name].push(cat.name);
            }
        }
    }

    ResponseHandler.send(res, "All categories", tree, 200);
};
