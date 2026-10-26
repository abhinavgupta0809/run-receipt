---
name: software-plan-pricing-comparison
description: "Use when asked to compare paid plans of two or more software products or apps, especially monthly versus yearly billing. Triggers: pricing analysis, plan comparison, subscription cost comparison, monthly vs annual price."
---

# Software plan pricing comparison

Produce an accurate side-by-side comparison of paid plan prices across several software products, showing monthly and yearly billing for each plan, with the date checked and the source.

## Inputs

- **products**: Products or apps whose paid plans should be compared. One or more. Example: Notion, Obsidian
- **billing_periods** (optional): Billing periods to capture for each plan. Example: monthly and yearly
- **plan_scope** (optional): Optional plan tiers to focus on, if the user does not want every paid tier. Example: individual paid plans only
- **currency** (optional): Currency or region the prices should be reported in, if it matters. Example: USD

Ask for a required input the request doesn't give. Work out optional ones yourself.

## Steps

1. For each product in the list, search the web for its official pricing page, using a query like "<product> pricing plans".
2. Choose the vendor's official pricing page or official pricing FAQ from the results over third-party reviews.
3. Fetch the page and read every paid plan name, price, billing unit (per seat, per user, per account) and currency.
4. Note which billing period the page shows by default, since many pages default to yearly.
5. Find the price for the other billing period. The monthly/yearly toggle may be rendered by script, so look in the fetched HTML, embedded JSON or page text for both price sets.
6. If the toggle is not in the fetched text, try a pricing API endpoint, a print or alternate view, or the vendor's help-center or FAQ page that lists prices for both periods.
7. If a product has only one billing period, or its core app is free with paid add-ons, record exactly that and list each paid add-on separately.
8. Record any discount the vendor states for yearly billing, plus seat minimums, taxes and regional pricing notes.
9. Use code to calculate the yearly per-month equivalent, the annual total and the percentage saved versus monthly billing for each plan.
10. Put the results in one table covering all products, with a source URL for each row.
11. Run the checks and fix any gaps before answering.

## Checks before you answer

- Every product in the input list has prices for both monthly and yearly billing, or a stated reason one is missing (for example, no monthly option, or free only).
- Each price comes from the vendor's official pricing or FAQ page, not from a third-party blog or a stale search snippet.
- The plan name matches the exact tier on the page, and free tiers are labeled as free rather than omitted.
- The billing period is stated for each price, and any yearly price shown as a per-month equivalent is labeled as such, with the annual total given if the page shows it.
- Currency, unit (per seat, per user, per account, per month, per year) and any minimum seat count or tax note are recorded for each price.
- The monthly toggle state was read from the page content, not assumed from the default view; if the toggle could not be confirmed, the answer says so.
- Yearly versus monthly savings are computed in code or checked by hand, and the percentage is compared with any discount the vendor states on its page.
- The date the prices were checked is stated in the answer, and any regional or promotional pricing is flagged.
- If two sources disagree, the discrepancy is reported and the more authoritative or more recent source is used.

- Recompute every number you derive (differences, totals, rankings, cheapest or largest) from the figures in your answer before you state it.

If a check fails, say which one in the answer instead of hiding it.

## Answer format

A short comparison table with one row per product and plan, with columns for monthly price, yearly price (per-month equivalent and annual total where shown), billing unit, currency, yearly savings percentage, and source URL. Below the table, add the date checked, notes on caveats such as free tiers, add-on pricing, seat minimums or regional pricing, and a one- or two-line takeaway on which billing period saves most.

Put each source as a full https link next to the figure it supports. Don't use numbered markers like [web:1].

## Where this skill came from

Written from 2 recorded browser sessions, 2026-10-25 (21 steps in all).

What changed between sessions became inputs:
- Products being compared: Notion and Obsidian, Todoist and Bear
- Search query used to find the pricing page: notion pricing plans, todoist pricing plans, bear app pro price
- Kind of page that holds the prices and how billing periods are shown: Official pricing page with a pay monthly/pay yearly toggle, Pricing page with a monthly/yearly tab, Pricing page with a monthly/yearly switch, Official FAQ page listing the paid tier's prices
