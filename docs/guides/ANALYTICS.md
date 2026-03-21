# Analytics Guide

> Complete guide to EventHub analytics dashboard.

## Overview

The Analytics Dashboard provides event organizers with real-time insights about their event's performance. Available in the Admin Panel under the **Analytics** tab.

## Access

Navigate to your event admin panel:
```
/e/{slug}/admin?tab=analytics
```

Or use the Analytics tab in the event admin interface.

## Dashboard Components

### Summary Cards

At the top of the dashboard, you'll see key metrics:

| Card | Description |
|------|-------------|
| **Total Views** | Number of page views |
| **Players** | Registered players |
| **Quiz Completions** | Players who completed the quiz |
| **Avg Score** | Average quiz score |

### Activity Timeline

Shows traffic patterns over time.

**Features:**
- Toggle between hourly and daily view
- Visual bar chart with Recharts
- Peak hour/day highlighted

### Conversion Funnel

Visualizes the user journey from visitor to engaged guest.

**Stages:**
1. **Visitors** - Page views
2. **Registered** - Players who signed up
3. **Quiz Started** - Began the quiz
4. **Quiz Completed** - Finished all questions
5. **Postcards Sent** - Created postcards

**Metrics:**
- Count at each stage
- Conversion rate between stages

### Score Distribution

Histogram showing how players scored.

**Features:**
- Score ranges on X-axis
- Number of players on Y-axis
- Mean, median, and mode statistics

## Technical Details

### Data Collection

Analytics data is collected automatically:

1. **Page Views** - Tracked via `POST /api/events/:slug/page-view`
2. **Quiz Events** - Tracked when players start/complete quiz
3. **Postcard Events** - Tracked when postcards are created

### Data Storage

Three PostgreSQL tables store analytics:

```sql
page_views
quiz_events  
postcard_events
```

See [Analytics API](../api/ANALYTICS.md) for schema details.

### Visualization

Uses **Recharts** for charts:
- `BarChart` for activity timeline
- `BarChart` for score distribution
- Custom funnel visualization

## Privacy Considerations

### What's Tracked

✅ Page views (anonymized by default)
✅ Quiz participation counts
✅ Score distributions (no individual scores shared)
✅ Aggregate engagement metrics

### What's NOT Tracked

❌ Individual player answers
❌ Personal messages on postcards
❌ User-specific browsing behavior
❌ IP addresses or device fingerprints

## Best Practices

### Before the Event

1. Share the event link early to build page views
2. Monitor conversion funnel to identify drop-off points
3. Encourage quiz completion with clear CTAs

### During the Event

1. Watch the activity timeline for peak times
2. Use postcard count to gauge engagement
3. Check score distribution to adjust difficulty

### After the Event

1. Export analytics for reporting
2. Compare completion rates across events
3. Identify successful engagement patterns

## Troubleshooting

### No Data Showing

1. Check browser console for API errors
2. Verify the analytics tab is selected
3. Confirm the event has traffic

### Inaccurate Counts

1. Page views may be throttled (100/min per IP)
2. Quiz completions require actual submissions
3. Refresh the page for updated data

## Related Docs

- [Analytics API](../api/ANALYTICS.md)
- [Admin Panel Flow](../../flows/eventhub-flows.md#4-admin-panel-del-evento)
