document.addEventListener("DOMContentLoaded", async () => {
	const searchInput = document.getElementById("search-input");
	const searchResultsContainer = document.getElementById("search-results-container");
	const searchResults = document.getElementById("search-results");

	const searchData = [];
	const api = await fetch(`/yukino-app/guides/api.json`).then(res => res.json());
	api.posts.forEach((post) => {
		searchData.push({
			title: post.title,
			url: post.url
		});
		post.toc.forEach((t) => {
			searchData.push({
				title: t.title,
				url: t.url
			});
		});

	});

	const fuse = new Fuse(searchData, {
		includeScore: true,
		keys: ["title"]
	});

	["input"].forEach(x => searchInput.addEventListener(x, (e) => {
		e.stopPropagation();

		searchResultsContainer.style.display = "none";
		searchResults.innerHTML = "";

		const terms = searchInput.value;
		if (!terms.length) return;

		const results = fuse.search(terms);
		if (!results.length) return;

		searchResultsContainer.style.display = "flex";
		results.sort((a, b) => a.score - b.score).forEach(({ item }, i) => {
			searchResults.innerHTML += `<a href="${item.url}" style="display: block; color: var(--light);"><span style="opacity: 0.7;">${i + 1}.</span> ${item.title}</a>`;
		});
	}));
});
