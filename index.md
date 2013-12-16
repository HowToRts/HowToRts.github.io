---
layout: default
title: Welcome!
---
<h3>Welcome to How to RTS</h3>

<p>I've been recently interested in RTS Games (Planetary Annihilation and SupCom in particular), so I plan to slowly build up an RTS engine of my own. Along the way I'll do some posts and miniprojects explaining and showing the various things involved.</p>

<p>I'll be posting mini examples as runnable javascript apps to explain how things work</p>

<h3>Done so far</h3>

<div class="bloglist">
{% for post in site.posts %}
	<small>{{ post.date | date_to_string }}</small>
	<h4 class="post-title"><a href="{{ post.url | replace_first: '/', '' }}">{{ post.title }}</a></h4>
	<p>{{ post.description }}</p>
{% endfor %}
</div>

<h3>Plan</h3>

<p>This is a rough list around what I plan on developing and writing up.</p>

<h4>RTS Basics</h4>
<ul>
<li>Tower defense essentials</li>
<li>Pathfinding - Dijkstra / A*</li>
<li>Modern Pathfinding - flow fields</li>
<li>AI - Planning</li>
</ul>
