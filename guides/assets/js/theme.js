document.addEventListener("DOMContentLoaded", () => {
	const themeBtn = document.getElementById("theme-toggler");

	const updateTheme = (isDark = localStorage.getItem("theme") === "dark") => {
		document.documentElement.classList[isDark ? "add" : "remove"]("dark");
		themeBtn.innerText = isDark ? "🌙" : "🌞";
	};

	updateTheme();

	themeBtn.addEventListener("click", () => {
		const isCurrentDark = localStorage.getItem("theme") === "dark";
		localStorage.setItem("theme", isCurrentDark ? "light" : "dark");
		updateTheme(!isCurrentDark);
	});
});
