---
layout: default
title: Blog
---

TODO: Styles in here need fixing

{% for post in site.posts %}
<div class="clearfix">
	<div class="span-3 post-date">
		{{ post.date | date_to_string }}
	</div>
	<div class="span-17 last">
		<h4 class="post-title"><a href="{{ post.url | replace_first: '/', '' }}">{{ post.title }}</a></h4>
		<p>{{ post.description }}</p>
	</div>
</div>
{% unless forloop.last %}<hr />{% endunless %}
{% endfor %}
