module BookList exposing (containerView, view)

import Book
import Html
import Html.Attributes
import Section


view : Book.ViewOptions -> List Book.Book -> List Book.Book -> List (Html.Html msg)
view viewOptions ratedBooks unratedBooks =
    [ if List.isEmpty ratedBooks then
        Html.text ""

      else
        Section.ratedBooks
            (containerView viewOptions ratedBooks)
    , if List.isEmpty unratedBooks then
        Html.text ""

      else
        Section.unratedBooks
            (containerView viewOptions unratedBooks)
    ]


containerView : Book.ViewOptions -> List Book.Book -> List (Html.Html msg)
containerView viewOptions books =
    [ Html.div [ Html.Attributes.class "book-grid" ] (List.map (Book.view viewOptions) books) ]
