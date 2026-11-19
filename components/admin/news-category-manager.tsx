"use client";

import { deleteNewsCategoryAction, saveNewsCategoryAction } from "@/app/admin/(dashboard)/news/actions";
import type { NewsCategory } from "@/lib/news/queries";

export function NewsCategoryManager({ categories }: { categories: NewsCategory[] }) {
  return (
    <section className="mt-12 border border-neutral-200 bg-white p-5 sm:p-8" aria-labelledby="news-categories-heading">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">Editorial setup</p>
        <h2 id="news-categories-heading" className="mt-2 text-2xl font-extrabold tracking-tight">News categories</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Deleting a category leaves its articles in place and clears their category.
        </p>
      </div>

      <form action={saveNewsCategoryAction} className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-xs font-bold uppercase tracking-wider">
          New category name
          <input
            name="name"
            type="text"
            required
            maxLength={80}
            className="mt-2 block w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal focus:border-[#da291c] focus:outline-none"
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-wider">
          URL slug (optional)
          <input
            name="slug"
            type="text"
            maxLength={100}
            placeholder="Generated from name"
            className="mt-2 block w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal focus:border-[#da291c] focus:outline-none"
          />
        </label>
        <button type="submit" className="self-end bg-[#da291c] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#b51f17]">
          Add category
        </button>
      </form>

      {categories.length ? (
        <ul className="mt-7 divide-y divide-neutral-200 border-t border-neutral-200">
          {categories.map(category => (
            <li key={category.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
              <form action={saveNewsCategoryAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="categoryId" value={category.id} />
                <label className="sr-only" htmlFor={`category-name-${category.id}`}>Category name</label>
                <input
                  id={`category-name-${category.id}`}
                  name="name"
                  type="text"
                  required
                  maxLength={80}
                  defaultValue={category.name}
                  className="border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-[#da291c] focus:outline-none"
                />
                <label className="sr-only" htmlFor={`category-slug-${category.id}`}>Category slug</label>
                <input
                  id={`category-slug-${category.id}`}
                  name="slug"
                  type="text"
                  required
                  maxLength={100}
                  defaultValue={category.slug}
                  className="border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-[#da291c] focus:outline-none"
                />
                <button type="submit" className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#b51f17] hover:bg-red-50">
                  Save
                </button>
              </form>

              <form
                action={deleteNewsCategoryAction}
                onSubmit={event => {
                  if (!window.confirm(`Delete "${category.name}"? Articles in this category will become uncategorized.`)) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="categoryId" value={category.id} />
                <button type="submit" className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">No categories have been created.</p>
      )}
    </section>
  );
}
